# How to Update Your Instagram Feed

Currently, the Instagram section uses static placeholder images. Browsers prevent standard websites from directly downloading Instagram images for security reasons (CORS).

You have two options to update this section:

## Option 1: Manual Image Updates (Recommended for now)
1. Download the images you want to display from your Instagram (`@will_it_rain_photos`).
2. Place those image files into the `resources/` folder in your project directory.
3. Open `index.html` in a text editor (like VS Code or Notepad).
4. Find the section that looks like this:
   ```html
   <img src="https://via.placeholder.com/400x400/1e293b/f8fafc?text=IG+Post+1" alt="Instagram Post 1">
   ```
5. Change the `src` attribute to point to your new image:
   ```html
   <img src="resources/my_cool_photo.jpg" alt="Instagram Post 1">
   ```

## Option 2: Use an Auto-Updating Widget
If you want the feed to update automatically without you changing code every time:
1. Go to a free widget provider like [SnapWidget](https://snapwidget.com/) or [Elfsight](https://elfsight.com/instagram-feed-instashow/).
2. Connect your Instagram account and generate an embed code snippet.
3. Open `index.html`.
4. Delete the entire `<div class="ig-grid">...</div>` block.
5. Paste the snippet provided by the widget service in its place.
