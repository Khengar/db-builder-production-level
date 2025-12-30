from PIL import Image, ImageOps

def optimize_image_for_ocr(image_path, output_path):
    # Load the image
    image = Image.open(image_path)
    
    # Check if image is likely "Dark Mode" (Dark background)
    # We calculate the average pixel brightness.
    # If average < 128, it's dark.
    gray = image.convert('L') # Convert to grayscale
    histogram = gray.histogram()
    pixels = sum(histogram)
    brightness = scale = len(histogram)
    
    total_brightness = sum(i * w for i, w in enumerate(histogram))
    average_brightness = total_brightness / pixels

    print(f"Average Brightness: {average_brightness}")

    if average_brightness < 128:
        print("Detected Dark Mode. Inverting colors...")
        # Invert the image (Black -> White, White -> Black)
        image = ImageOps.invert(image.convert('RGB'))
    else:
        print("Image is already Light Mode. Skipping inversion.")

    # Optional: Increase contrast to make text "pop"
    # This helps remove the "fuzziness"
    image = ImageOps.autocontrast(image)
    
    # Save the optimized image
    image.save(output_path)
    print(f"Saved optimized image to {output_path}")

# Usage
optimize_image_for_ocr("your_screenshot.png", "optimized_screenshot.png")