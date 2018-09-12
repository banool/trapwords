import argparse
import glob
import os

from PIL import Image


# The usage for this should be pretty self-explanatory.
# See the output of --help and it should all make sense.
# A usage example for an image with cards 5 wide and 4 high:
# python3 image_splitter.py --width 5 --height 4 --output-path images/ --target three.jpg

# Tips and reminders:
# Make sure the input images are cropped to the edge of the grid.
# A background matching the colour of the cards is best.
# The more perfectly-rectangular the total grid is the better.
# If doing this on multiple images, ensure the exposure is similar.


def crop(input_fname, output_path, cards_wide, cards_high):
    im = Image.open(input_fname)
    img_width, img_height = im.size
    width = img_width // cards_wide + 1
    height = img_height // cards_high + 1
    count = 0
    for i in range(0, img_width, width):
        for j in range(0, img_height, height):
            # Making it square.
            diff = abs(width - height)
            if width < height:
                box = (i, j + diff // 2, i + width, j + height - diff // 2)
            else:
                box = (i + diff // 2, j, i + width - diff // 2, j + height)

            # Final correction
            if box[2] - box[0] != box[3] - box[1]:
                new_width = box[0] + (box[3] - box[1])
                box = (box[0], box[1], new_width, box[3])
            print(box)

            cropped = im.crop(box)
            name, ext = os.path.splitext(
                os.path.basename(os.path.normpath(input_fname))
            )
            path = os.path.join(output_path, f"{name}-piece-{count}{ext}")
            ext = ext[1:]
            if ext.lower() == "jpg":
                ext = "jpeg"
            glob.glob(path)
            print(f"Saving to {path}")
            cropped.save(path, ext)
            count += 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", required=True, help="The image you want to split")
    parser.add_argument(
        "--width", required=True, type=int, help="Number of cards wide (integer)"
    )
    parser.add_argument(
        "--height", required=True, type=int, help="Number of cards high (integer)"
    )
    parser.add_argument("--output-path", default=".")

    args = parser.parse_args()

    crop(args.target, args.output_path, args.width, args.height)
