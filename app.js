const express = require('express');
const webcam = require('node-webcam');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const Replicate = require('replicate');

const app = express();
const port = 3000;

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
  });

// Serve static files from the 'frames' directory
app.use('/frames', express.static(path.join(__dirname, 'frames')));

// Set up a route to serve the HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Set up a route to handle the button click and capture an image
app.get('/capture', captureAndDisplayImage, getAIImageDescription);

async function captureAndDisplayImage (req, res, next) {
    try {
        const captureOptions = {
          width: 640,
          height: 480,
          delay: 0,
          quality: 100,
          output: 'jpeg', // Specify the desired image format (jpeg or png)
          callbackReturn: 'buffer', // Change callbackReturn to 'buffer'
        };
    
        // Capture the image asynchronously
        const imgBuffer = await new Promise((resolve, reject) => {
          webcam.capture('capture', captureOptions, (err, data) => {
            if (err) {
              console.error('Error capturing image:', err);
              reject(new Error('error capturing image'));
            } else {
              // Resolve with the image buffer
              resolve(Buffer.from(data));
            }
          });
        });
    
        // Resize the image using sharp
        const resizedImgBuffer = await sharp(imgBuffer).resize(250).toBuffer();
    
        // Save the resized image to a file (you may want to save it with a unique name)
        const imagePath = path.join(__dirname, 'frames', 'captured_frame.jpg');
        fs.writeFileSync(imagePath, resizedImgBuffer);
          
        req.imagePath = imagePath;

        return next();
      } catch (error) {
        console.error('Error:', error);
    
        if (error.message === 'error capturing image') {
          res.status(500).send('Error capturing image');
        } else if (error.message === 'error resizing image') {
          res.status(500).send('Error resizing image');
        } else {
          res.status(500).send('Unknown error');
        }
      }
}

async function getAIImageDescription (req, res, next) {
    try {
        // Read the file into a buffer
        const data = await fs.promises.readFile(req.imagePath);
        // Convert the buffer into a base64-encoded string
        const base64 = data.toString("base64");
        // Set MIME type for PNG image
        const mimeType = "image/jpeg";
        // Create the data URI
        const dataURI = `data:${mimeType};base64,${base64}`;

        const prediction = await replicate.run(
            "yorickvp/llava-13b:e272157381e2a3bf12df3a8edd1f38d1dbd736bbb7437277c8b34175f8fce358",
            {
              input: {
                image: dataURI,
                top_p: 1,
                prompt: 'Describe this image',
                max_tokens: 1024,
                temperature: 0.2
              }
            },
          );

          const outputWithTone = await replicate.run(
            "mistralai/mistral-7b-instruct-v0.1:5fe0a3d7ac2852264a25279d1dfb798acbc4d49711d126646594e212cb821749",
            {
              input: {
                debug: false,
                top_k: 50,
                top_p: 0.9,
                prompt: `Here is a description of an image after the word 'DESCRIPTION. Change the tone of the existing description to sound like Sir David Attenborough narrating a nature documentary. Make it snarky and funny. Return only the narration as a string.
                \n\nDESCRIPTION:\n${prediction.join(' ')}`,
                temperature: 0.7,
                max_new_tokens: 128,
                min_new_tokens: -1
              }
            }
          );
        relativePath = path.relative(__dirname, req.imagePath);

        return res.send({text: 'Image captured and resized successfully!', imagePath: relativePath, description: outputWithTone.join(' ')});

    } catch (error) {
        console.error('Error:', error);
    }
}

// Start the Express server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
