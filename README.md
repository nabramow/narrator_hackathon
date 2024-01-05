# Narrate Webcam as Sir David Attenborough project

This project is based on [this one here](https://replicate.com/blog/how-to-create-an-ai-narrator). The original is in Python, so my main task was to get it working in Javascript using Node.js.

I completed this project as I wanted to play around with AI a bit more, and it utilized three different models:

- [Llava-13b, an open-source vision model](https://replicate.com/yorickvp/llava-13b). This allows you to provide an image with a prompt. In this case my prompt was. "Describe the image", but you can ask it more specific questions about the image as well.
- [Mistral-7b-instruct-v0.1](https://replicate.com/mistralai/mistral-7b-instruct-v0.1), an open-source generative text model fine-tuned for instructions. This is used to take the image description from the previous step and change the tone to be like David Attenborough describing a nature documentary.
- [ElevenLabs text-to-speech](https://elevenlabs.io/), this is used to get the read the text aloud in the voice of Sir David Attenborough. In this case I got lucky and it already had a voice like his, but if you pay a higher subscription you can also upload your own audio files and clone the voice for your purposes.

  ## Examples

  Screenshot of what you see. Click the "Capture Image" button, a screenshot will appear on the screen. You'll get status updates of what step it's on, then the resulting description will appear. The narration will play through your speakers.
  
<img width="757" alt="Screenshot 2024-01-05 at 9 35 51 AM" src="https://github.com/nabramow/narrator_hackathon/assets/18261566/f980f03a-2a19-4b2b-8699-e2c07a07cadc">

Here's a shitty phone video with the voice narration and everything:

https://github.com/nabramow/narrator_hackathon/assets/18261566/665f709e-fffb-485f-b021-19d82c8acd93

  ## Tech Stack

  I used Node.js and Express to throw together a super simple backend. This serves the HTML page and has three different routes for capturing the image, getting the description and reading the text aloud. I broke it into three routes mostly so I could quickly provide status updates after each step, but you could easily just do it in one.

  To take the webcam image I used [node-webcam](https://github.com/chuckfairy/node-webcam). As I needed to throw this together quickly for a hackathon, I opted to just take a webcam pic via button click rather than snap a pic every 5 seconds like the original. This is mostly because I am cheap. To do it like the original you could just drop the api call into a `setInterval`.

  Important is after taking the picture or want to resize the image to be smaller before passing to the AI that generates a description. This saves money. I used [sharp](https://github.com/lovell/sharp) for this, which is a Node-API module that converts large images in common formats to smaller, web-friendly JPEG, PNG, WebP, GIF and AVIF images of varying dimensions.

  To play the sound, I used the [play-sound](https://github.com/shime/play-sound) package. This plays sound files from Node.js via your speakers. I liked this since it checks for a bunch of different audio players. In my case this allowed me to just drop it in and have it work.

  ## Notes on potential improvements

  The biggest struggle was getting the prompt changed in tone to David Attenborough. The prompt I had the most success with was, `Here is a description of an image after the word 'DESCRIPTION'. Change the tone of the existing description to sound like Sir David Attenborough narrating a nature documentary. Make it snarky and funny. Return only the narration as a string.\n\nDESCRIPTION:\n${description}`.

Still, this was very finicky. Sometimes it returned it with different headers, so I did some parsing for that. Sometimes it returned the original description AND the new one, so I did some parsing for that too. It also cut off mid sentence almost always. This is based on the `max_new_tokens` parameter, which I set to `150` for the demo but `128` is default. I didn't want it to get too expensive as I paid for the text-to-speech model as I used up the free tier pretty quickly. I'd like to fine a way to get that more consistent and to always end in a full sentence.



That's it! I hope this provides some entertainment. It was a good chance to work with some different AI models.
