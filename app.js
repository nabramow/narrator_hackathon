const express = require('express');
const webcam = require('node-webcam');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// Serve static files from the 'frames' directory
app.use('/frames', express.static(path.join(__dirname, 'frames')));

// Set up a route to serve the HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Set up a route to handle the button click and capture an image
app.get('/capture', async (req, res) => {
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

      const relativePath = path.relative(__dirname, imagePath);
      
      res.send({text: 'Image captured and resized successfully!', imagePath: relativePath});
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
  });

// Start the Express server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
