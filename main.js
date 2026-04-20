const canvas = document.getElementById('mountainCanvas');
const ctx = canvas.getContext('2d');

let width, height;
let terrainLayers = [];

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    generateTerrain();
}

function generateTerrain() {
    terrainLayers = [];
    
    // Generate 3 layers of terrain with craggy, mountainous properties
    const layerConfigs = [
        { yOffset: height * 0.45, amplitude: height * 0.35, roughness: 0.55, baseColor: 15 }, // Background
        { yOffset: height * 0.7, amplitude: height * 0.3, roughness: 0.6, baseColor: 8 },   // Mid
        { yOffset: height * 0.95, amplitude: height * 0.25, roughness: 0.65, baseColor: 3 }   // Foreground
    ];

    layerConfigs.forEach(config => {
        let points = [0, 0]; // Start and end at 0 displacement
        let segments = 1;
        // High detail: roughly 1 segment per 3 pixels
        const maxSegments = Math.ceil(width / 3); 
        
        // Midpoint displacement algorithm
        while (segments < maxSegments) {
            let newPoints = [];
            for (let i = 0; i < segments; i++) {
                newPoints.push(points[i]);
                let midpoint = (points[i] + points[i + 1]) / 2;
                // Add jagged displacement
                let displacement = (Math.random() - 0.5) * config.amplitude * config.roughness;
                newPoints.push(midpoint + displacement);
            }
            newPoints.push(points[points.length - 1]);
            points = newPoints;
            segments *= 2;
            config.amplitude *= 0.5;
        }

        // Map to screen coordinates, extending slightly past edges
        const step = (width * 1.2) / (points.length - 1);
        const startX = -width * 0.1;
        
        const mappedPoints = points.map((p, i) => {
            return {
                x: startX + (i * step),
                y: config.yOffset - p
            };
        });

        terrainLayers.push({
            points: mappedPoints,
            baseColor: config.baseColor
        });
    });
}

function normalize(vx, vy) {
    const len = Math.sqrt(vx * vx + vy * vy);
    if (len === 0) return {x: 0, y: 0};
    return {x: vx / len, y: vy / len};
}

function dot(v1, v2) {
    return v1.x * v2.x + v1.y * v2.y;
}

function render(time) {
    ctx.clearRect(0, 0, width, height);

    // Sun cycle: 10 minutes = 600,000 ms
    const cycleTime = 10 * 60 * 1000; 
    // Add offset so it starts at noon (0.25 of the cycle)
    const timeOffset = cycleTime * 0.25; 
    const t = ((time + timeOffset) % cycleTime) / cycleTime; // 0 to 1
    
    // Sun position (arch across screen)
    // -Math.PI is sunrise (left), -Math.PI/2 is noon (top), 0 is sunset (right)
    const angle = t * Math.PI * 2 - Math.PI; 
    const cx = width / 2;
    const cy = height; 
    const radius = Math.max(width, height) * 0.7;
    
    const sunX = cx + Math.cos(angle) * radius;
    const sunY = cy + Math.sin(angle) * radius;

    // Day/Night factor
    const sunHeightRatio = Math.max(0, (height - sunY) / height); 

    // Draw Sky - Dark and atmospheric to match the reference
    const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
    if (sunHeightRatio > 0) {
        // Day / Sunset - Monochromatic with very subtle atmospheric scattering
        const v1 = Math.floor(5 + sunHeightRatio * 30);
        const v2 = Math.floor(10 + sunHeightRatio * 40);
        skyGradient.addColorStop(0, `rgb(${v1}, ${v1}, ${v1+5})`);
        skyGradient.addColorStop(1, `rgb(${v2}, ${v2}, ${v2+10})`);
    } else {
        // Night
        skyGradient.addColorStop(0, 'rgb(2, 2, 3)');
        skyGradient.addColorStop(1, 'rgb(5, 5, 8)');
    }
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, width, height);

    // Draw the sun
    if (sunY < height + 100) {
        // Subtle glow
        ctx.beginPath();
        ctx.arc(sunX, sunY, 120, 0, Math.PI * 2);
        const glowGradient = ctx.createRadialGradient(sunX, sunY, 30, sunX, sunY, 120);
        glowGradient.addColorStop(0, 'rgba(245, 240, 230, 0.3)');
        glowGradient.addColorStop(1, 'rgba(245, 240, 230, 0)');
        ctx.fillStyle = glowGradient;
        ctx.fill();

        // Core sun - lightly desaturated pale yellow
        ctx.beginPath();
        ctx.arc(sunX, sunY, 30, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(245, 240, 230, 0.9)'; 
        ctx.fill();
    }

    // Draw Terrain
    terrainLayers.forEach(layer => {
        for (let i = 0; i < layer.points.length - 1; i++) {
            const p1 = layer.points[i];
            const p2 = layer.points[i+1];

            // 1. Calculate normal of the mountain segment
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            // Perpendicular vector pointing "up/out"
            const normal = normalize(-dy, dx);

            // 2. Vector to sun
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            const toSunX = sunX - midX;
            const toSunY = sunY - midY;
            const toSun = normalize(toSunX, toSunY);

            // 3. Lighting Intensity (Dot product)
            let light = dot(normal, toSun);
            // Only light faces pointing towards the sun, and scale by sun height
            light = Math.max(0, light) * Math.min(1, sunHeightRatio + 0.2); 

            // 4. Dramatic Contrast Curve (to match the reference image)
            // Power curve makes shadows deeper and highlights sharper
            let intensity = Math.pow(light, 2.5) * 220; 
            
            // 5. Final Color
            const c = Math.floor(layer.baseColor + intensity);
            const clampedC = Math.min(255, Math.max(0, c));

            // Draw the vertical sliver for this segment
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(p2.x, height);
            ctx.lineTo(p1.x, height);
            ctx.closePath();

            // Very subtle blue tint to shadows for atmospheric depth
            ctx.fillStyle = `rgb(${clampedC}, ${clampedC}, ${clampedC + (clampedC < 50 ? 2 : 0)})`;
            
            // Stroke to prevent anti-aliasing gaps between segments
            ctx.strokeStyle = ctx.fillStyle;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fill();
        }
    });

    requestAnimationFrame(render);
}

// Initialization
window.addEventListener('resize', resize);
resize();
requestAnimationFrame(render);

function renderDetails(data) {
    // Build Project List
    const projectList = document.getElementById('project-list');
    if(projectList && data.projects) {
        projectList.innerHTML = data.projects.map(proj => `
            <div class="project-card">
                ${proj.imageUrl ? `<img src="${proj.imageUrl}" alt="${proj.title} Preview">` : ''}
                <div class="project-content">
                    ${proj.title ? `<h3>${proj.title}</h3>` : ''}
                    ${proj.collaborators && proj.collaborators.length > 0 ? `<div class="collaborators">with ${proj.collaborators.map(c => `<a href="${c.url}" target="_blank" class="collaborator-link">${c.name}</a>`).join(', ')}</div>` : ''}
                    ${proj.description ? `<p class="project-desc">${proj.description}</p>` : ''}
                    ${proj.tags && proj.tags.length > 0 ? `<div class="tag-container">${proj.tags.map(t => `<span class="tag-bubble">${t}</span>`).join('')}</div>` : ''}
                    ${(proj.hasPaper && proj.paperUrl) ? `<a href="${proj.paperUrl}" target="_blank" class="paper-link"><img src="resources/paper.svg" class="svg-icon" style="width:16px;height:16px" alt="Paper"> Read Paper</a>` : ''}
                </div>
            </div>
        `).join('');
    }

    // Build Paper List
    const paperList = document.getElementById('paper-list');
    if(paperList && data.papers) {
        paperList.innerHTML = data.papers.map(paper => `
            <div class="paper-card">
                <div class="paper-card-info">
                    <h3>${paper.title}</h3>
                    <p>${paper.authors} &bull; ${paper.conference}</p>
                </div>
                <a href="${paper.url}" target="_blank" class="social-icon" style="width:40px;height:40px;border-radius:8px;"><img src="resources/paper.svg" class="svg-icon" alt="Link"></a>
            </div>
        `).join('');
    }

    // Build Education List
    const eduList = document.getElementById('education-list');
    if(eduList && data.education) {
        eduList.innerHTML = data.education.map(edu => `
            <div class="education-card" style="margin-top: 0; margin-bottom: 20px;">
                <img src="${edu.logoUrl}" alt="${edu.school} Logo">
                <div class="education-info">
                    <h3>${edu.school}</h3>
                    <p><strong>Major:</strong> ${edu.major}</p>
                    <p><strong>Grade:</strong> ${edu.grade}</p>
                    <p><strong>Units Completed:</strong> ${edu.units}</p>
                </div>
            </div>
        `).join('');
    }

    // Build Contact List
    const contactList = document.getElementById('contact-list');
    if(contactList && data.contact) {
        contactList.innerHTML = data.contact.map(contact => `
            <div class="contact-item">
                <img src="${contact.icon}" alt="${contact.name} Icon">
                <a href="${contact.link}" target="_blank">${contact.info}</a>
            </div>
        `).join('');
    }
}

// 1. Try to load from cache first for instant render
const cachedData = localStorage.getItem('portfolioDetails');
if (cachedData) {
    try {
        renderDetails(JSON.parse(cachedData));
    } catch (e) {
        console.error('Error parsing cached data', e);
    }
}

// 2. Fetch fresh data to ensure it's up to date
fetch('details.json')
    .then(response => response.json())
    .then(data => {
        // Save to cache for next time
        localStorage.setItem('portfolioDetails', JSON.stringify(data));
        // Re-render with fresh data
        renderDetails(data);
    })
    .catch(err => console.error('Error loading details:', err));
