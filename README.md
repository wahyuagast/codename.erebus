# Image Encryption Based on Chaotic Logistic Map and LFSR

An interactive undergraduate thesis showcase for a grayscale image cipher that combines a chaotic logistic map with an 8-bit linear feedback shift register (LFSR).

The original thesis algorithm is available at [wahyuagast/image-encryption-chaotic-lfsr](https://github.com/wahyuagast/image-encryption-chaotic-lfsr). This site is a browser-based interactive showcase of that work.

The project runs entirely in the browser using vanilla HTML, CSS, and JavaScript. It includes explanatory visualizations for the chaotic orbit, LFSR state, pixel shuffling, diffusion, and a live 256 x 256 encryption/decryption laboratory.

## Features

- Generate a sample grayscale subject or load an image from disk.
- Center-crop and convert uploaded images to 256 x 256 grayscale.
- Bind the logistic-map seed to the image intensity sum.
- Shuffle pixels using a logistic-map orbit.
- Apply forward and backward diffusion using an LFSR keystream.
- Verify an exact encrypt/decrypt round trip in the browser.
- Explore animated pipeline, chaos, LFSR, confusion, and diffusion visualizations.

## Run Locally

No package installation or build step is required.

1. Clone the repository.
2. Open `index.html` in a modern browser.
3. In the **Live laboratory** section, generate the sample subject or upload an image.
4. Select **Encrypt -> decrypt** to run the round-trip demonstration.

Opening the file directly is sufficient. A local static server also works, for example:

```text
python -m http.server
```

Then visit `http://localhost:8000`.

## Cipher Outline

For an image with $N = H x W$ grayscale pixels, the implementation:

1. Flattens the image into a one-dimensional pixel vector.
2. Computes the normalized pixel sum and modifies the logistic seed:
   `x0 = (0.123456789 + sum(I) / (255N)) mod 1`.
3. Iterates the logistic map with `r = 3.99` and sorts the orbit to create a permutation.
4. Reorders the pixels using that permutation.
5. Generates an LFSR stream from the seed `0b10101010` with taps `[7, 5, 4, 3]`.
6. Applies forward diffusion followed by a backward carry pass, with all values reduced modulo 256.

Decryption reverses the diffusion passes, regenerates the same chaotic permutation and keystream, and restores the original pixel order.

## Project Structure

| File | Purpose |
| --- | --- |
| `index.html` | Page structure, explanatory content, and laboratory controls |
| `styles.css` | Visual design and responsive layout |
| `app.js` | Logistic map, LFSR, encryption/decryption, canvas rendering, and interactions |

## Security Notice

This is an educational and research demonstration, not a production cryptosystem. The LFSR is short, the logistic map uses floating-point arithmetic, and the image-dependent key material must be available for decryption. Do not use this implementation to protect sensitive data; use a reviewed standard such as AES or another modern authenticated-encryption scheme instead.

## License

The project is intended to be released under the MIT License.