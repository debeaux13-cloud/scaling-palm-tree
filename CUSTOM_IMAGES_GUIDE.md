# Custom Images Guide for Main Character Studios

## Overview
This guide explains how to replace the template images with your own custom photos for the Main Character Studios website.

## Image Locations

All images should be placed in: `worker/public/images/`

## Required Images

### Hero Section Image
- **Filename**: `hero-main.jpg`
- **Purpose**: Large background image for the hero/landing section
- **Recommended size**: 1920x1080px or larger (16:9 aspect ratio)
- **Format**: JPG, PNG, or WebP
- **Description**: Should show a cinematic, emotional scene that captures attention. Currently showing family with treehouse and pets.

### Demo Gallery Images (8 images)
These showcase different story types users can create:

| Filename | Story Type | Recommended Size | Description |
|----------|-----------|-----------------|-------------|
| `demo-1.jpg` | Family Adventures | 1280x720px (16:9) | Warm, cinematic family moments |
| `demo-2.jpg` | Magical Fantasy | 1280x720px (16:9) | Wizards, dragons, enchanted worlds |
| `demo-3.jpg` | Pet Adventures | 1280x720px (16:9) | Dogs, cats, and animal companions |
| `demo-4.jpg` | Romance & Celebration | 1280x720px (16:9) | Weddings, anniversaries, special moments |
| `demo-5.jpg` | Sci-Fi Expeditions | 1280x720px (16:9) | Space exploration, futuristic worlds |
| `demo-6.jpg` | Epic Quests | 1280x720px (16:9) | Adventure and exploration journeys |
| `demo-7.jpg` | Mystical Journeys | 1280x720px (16:9) | Enchanted forests, magical worlds |
| `demo-8.jpg` | Cosmic Adventures | 1280x720px (16:9) | Alien landscapes, otherworldly scenes |

## Steps to Add Your Images

### Step 1: Create the Images Directory
```bash
mkdir -p worker/public/images
```

### Step 2: Add Your Images
Place your images in the `worker/public/images/` folder:

```
worker/public/images/
├── hero-main.jpg
├── demo-1.jpg
├── demo-2.jpg
├── demo-3.jpg
├── demo-4.jpg
├── demo-5.jpg
├── demo-6.jpg
├── demo-7.jpg
└── demo-8.jpg
```

### Step 3: Update Image References (if needed)
If you use different filenames, update the paths in:
- `worker/app/hero.tsx` — Change `hero-main.jpg` to your filename
- `worker/app/demo-gallery.tsx` — Update demo image filenames (demo-1.jpg through demo-8.jpg)

## Image Specifications

### Hero Image
- **Aspect Ratio**: 16:9 (widescreen)
- **Resolution**: 1920x1080px minimum (can be 2560x1440px or higher)
- **File Size**: Keep under 500KB (use compression tools)
- **Content**: Focus on emotions and storytelling — should make visitors want to create

### Demo Gallery Images
- **Aspect Ratio**: 16:9
- **Resolution**: 1280x720px to 1920x1080px
- **File Size**: Keep under 150KB each (important for gallery performance)
- **Content**: Show variety of story types to inspire different use cases

## Image Optimization Tools

1. **TinyPNG** (https://tinypng.com/) — Best for PNG/JPG compression
2. **ImageOptim** (Mac) — Local optimization tool
3. **Squoosh** (https://squoosh.app/) — Google's free image tool
4. **FileOptimizer** (Windows) — Batch compression tool

## Testing Your Images

### Local Testing
```bash
cd worker
npm run dev
# Visit http://localhost:3000
```

Check:
- Images load properly
- Correct aspect ratios display
- No distortion or cropping issues
- Page loads quickly

### Deploy to Vercel
```bash
git add .
git commit -m "Add custom images for hero and demo gallery"
git push
```

Monitor in Vercel dashboard:
- Check Core Web Vitals
- Verify images load fast
- Use Lighthouse audit

## Troubleshooting

### Images Not Showing?
1. Verify files are in `worker/public/images/`
2. Check filename matches exactly (case-sensitive on Linux)
3. Restart dev server: `npm run dev`
4. Clear browser cache (Ctrl+Shift+Delete or Cmd+Shift+Delete)

### Slow Page Loading?
1. Compress images using tools above
2. Use WebP format (update filename to `.webp`)
3. Aim for <100KB per demo image

### Wrong Aspect Ratio Display?
CSS uses `object-fit: cover` which crops to fit the container:
- If crop looks wrong, adjust your source image
- Can modify `object-position` CSS property to change crop point

### Image Quality Issues?
- Use at least 1280x720px for demo images
- Avoid upscaling small images
- Verify original quality before compression

## Advanced: Using Next.js Image Component

For even better performance, you can replace the standard `<img>` tags with Next.js Image component:

```tsx
import Image from 'next/image';

<Image
  src="/images/hero-main.jpg"
  alt="Description"
  width={1920}
  height={1080}
  priority
  quality={85}
/>
```

This provides automatic optimization, lazy loading, and responsive sizing.

## File Size Reference

Optimized file sizes to aim for:
- Hero image: 200-400KB
- Demo images: 80-120KB each
- Total page images: ~1.2MB

## Next Steps

1. ✅ Create `worker/public/images/` directory
2. ✅ Add your 9 custom images (1 hero + 8 demos)
3. ✅ Test locally with `npm run dev`
4. ✅ Push to GitHub and deploy to Vercel
5. ✅ Monitor performance and Core Web Vitals

That's it! Your page will now display with your custom images instead of the template ones.
