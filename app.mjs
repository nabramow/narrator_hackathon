import express from "express";
import fetch from 'node-fetch';
import webcam from 'node-webcam';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import Replicate from 'replicate';
import createPlayer from 'play-sound';

const player = createPlayer({});
const __filename = new URL(import.meta.url).pathname;
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
  });

// Serve static files from the 'frames' directory
app.use('/frames', express.static(path.join(__dirname, 'frames')));

// Route to serve the HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.use(express.json());

// Route to capture image, get description and play audio narration 
app.get('/capture', captureAndDisplayImage);

app.post('/describe', getAIImageDescription);

app.post('/read', generateAudio);

async function captureAndDisplayImage (req, res) {
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
              console.log("Image successfully captured...")
              resolve(Buffer.from(data));
            }
          });
        });
    
        // Resize the image using sharp
        const resizedImgBuffer = await sharp(imgBuffer).resize(250).toBuffer();
    
        // Save the resized image to a file
        const imagePath = path.join(__dirname, 'frames', 'captured_frame.jpg');
        fs.writeFileSync(imagePath, resizedImgBuffer);
          
        req.imagePath = imagePath;

        return res.status(200).send({ imagePath: path.relative(__dirname, imagePath) })
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

async function getAIImageDescription (req, res) {
    try {
        // Read the file into a buffer
        const data = await fs.promises.readFile(req.body.imagePath);
        // Convert the buffer into a base64-encoded string
        const base64 = data.toString("base64");
        // Set MIME type for PNG image
        const mimeType = "image/jpeg";
        // Create the data URI
        const dataURI = `data:${mimeType};base64,${base64}`;

        console.log("Getting image description...")

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
          
          console.log("Narration sent to Sir David Attenborough for review...");

          const outputWithTone = await replicate.run(
            "mistralai/mistral-7b-instruct-v0.1:5fe0a3d7ac2852264a25279d1dfb798acbc4d49711d126646594e212cb821749",
            {
              input: {
                debug: false,
                top_k: 50,
                top_p: 0.9,
                prompt: `<s>[INST]Here is a description of an image below.[/INST]<s> [INST]Change the tone of the existing description to sound like Sir David Attenborough narrating a nature documentary.[/INST] [INST]Make it snarky and funny.[/INST] [INST]Return only the narration as a string.[/INST]
                \n\nDESCRIPTION:\n${prediction.join(' ')}`,
                temperature: 0.7,
                max_new_tokens: 128,
                min_new_tokens: -1
              }
            }
          );

        let description = outputWithTone.join(' ');

        if (description.includes("NARRATION:")) {
          const parsedResult = description.split('NARRATION:');
          description = parsedResult[1];
        }

        if (description.includes("NARRATOR:")) {
          const parsedResult = description.split('NARRATOR:');
          description = parsedResult[1];
        }

        return res.status(200).send({ description });
    } catch (error) {
        console.error('Error:', error);
    }
}

async function generateAudio (req, res) {
    try {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`, 
            {
                method: 'POST',
                headers: {'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json'},
                body: JSON.stringify({ text: req.body.description })
            }
        );

        const data = await response.body;

        // Write the buffer to a temporary file
        const tempFilePath = path.join(__dirname, 'temp', 'temp_audio.mp3');
        await fs.promises.writeFile(tempFilePath, data);

        // Play the temporary file
        player.play(tempFilePath, (err) => {
          if (err) {
          console.error('Error playing audio:', err);
          return res.status(500).send('Error playing audio');
          }

          res.status(200).send("You're officially the star of Planet Earth!")
        });

 
    } catch (error) {
        console.error('Error:', error);
    }
}

// Start the Express server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
