const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require('axios');
const request = require('request');
const swaggerUI = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");


const app = express();
const port = 3000;
require('dotenv').config();

const swaggerDetails = {
  swaggerDefinition: {
    info: {
      title: "ITIS 6177 Final Project",
      version: "1.0.0",
      description:
        "ITIS 6177 Final Project on Text to Speech using Azure API",
    },
    host: "localhost:3000",
    basePath: "/",
  },
  apis: ["./app.js"],
};

const swaggerSpecs = swaggerJsdoc(swaggerDetails);
app.use("/apidocs", swaggerUI.serve, swaggerUI.setup(swaggerSpecs));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

/**
 * @swagger
 * /availableVoices:
 *     get:
 *       description: This API will return all the available voices.
 *       produces:
 *          - application/json
 *       responses:
 *          200:
 *              description: An array of JSON objects of all voices available.
 *          401:
 *              description: Unauthorized request
 *          400:
 *              description: A bad request
 */
app.get("/availableVoices", async (req,res) => {
  try {
    const response = await axios.get(`https://eastus.tts.speech.microsoft.com/cognitiveservices/voices/list`, {
      params: {
        'Ocp-Apim-Subscription-Key': process.env.ACCESS_KEY
      }}
    );
    if(response.status == 200) {
      res.send(response.data);
    } else {
      res.send("Error fetching data from the API");
    }
  } catch (err) {  
    res.send(err.message);
  }
});


/**
 * @swagger
 * /convert:
 *  post:
 *    description: This API converts a given text to speech
 *    consumes:
 *    - application/json
 *    produces:
 *    - audio/x-wav
 *    parameters:
 *    - in: body
 *      name: features
 *      required: true
 *      schema:
 *        type: string
 *        $ref: "#/definitions/speechFeatures"
 *    requestBody:
 *      request: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: "#definitions/speechFeatures"
 *    responses:
 *      200:
 *       description: Returns a successfully converted text to speech audio file
 *      401:
 *       description: Unauthorized request
 *      400:
 *       description: A bad request
 * definitions:
 *   speechFeatures:
 *     type: object
 *     required:
 *     - text
 *     properties:
 *       text:
 *         type: string
 *         example: "Hi this is Aravind"
 *       expression:
 *         type: string
 *         example: sad
 *       volume:
 *         type: string
 *         example: loud
 */
app.post("/convert", async (req,res) => {
  let text = req.body.text ? req.body.text: res.status(400).send("Please send text to convert it into a speech");
  let expression = req.body.expression ? req.body.expression : "calm";
  let volume = req.body.volume ? req.body.volume: "soft";

  try {
    const response = await axios.post("https://eastus.api.cognitive.microsoft.com/sts/v1.0/issueToken",{},{
      headers: {
        "Ocp-Apim-Subscription-Key": process.env.ACCESS_KEY,
        "Content-type": "application/x-www-form-urlencoded"
      }}
    );
    if(response.status == 200) {
      let accessToken = response.data;
      request({
        method: 'POST',
        uri: "https://eastus.tts.speech.microsoft.com/cognitiveservices/v1",  
        headers: {
          'Authorization': 'Bearer ' + accessToken,
          'User-Agent': 'Text-to-speech-api',
          'X-Microsoft-OutputFormat': 'riff-24khz-16bit-mono-pcm',
          'Content-Type': 'application/ssml+xml'
        },
        body: `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">
                  <voice name="en-US-AriaNeural">
                    <prosody volume="${volume}">
                      <mstts:express-as style="${expression}" >
                          ${text}
                      </mstts:express-as>
                    </prosody>
                  </voice>
               </speak>`
      }, (error, result, body) => {
        if (result.statusCode == 200) {
          console.log("Converted Given text to Speech");  
        }
    }).pipe(res);
    } else {
      res.status(response.status).send(response.message);
    }
  } catch (err) {
    res.send(err.message);
  }
});

app.listen(port, (error) => {
  if (!error) {
    console.log(`Server is Successfully running and is listening on port ${port}`);
  } else {
    console.log("Error occurred, server can't start", error);
  }
});