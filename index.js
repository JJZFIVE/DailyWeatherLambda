// require("dotenv").config();
const { Configuration, OpenAIApi } = require("openai");
const axios = require("axios");
const twilioClient = require("twilio")(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Weather provided by https://www.weatherapi.com
const ZIPCODE = 27708;
const query = `https://api.weatherapi.com/v1/forecast.json?key=${process.env.WEATHER_KEY}&q=${ZIPCODE}&days=1&aqi=no&alerts=no`;
const START_HOUR = parseInt(process.env.START_HOUR);
const Z5_NUMBER = process.env.Z5_NUMBER;
const JOE_NUMBER = process.env.JOE_NUMBER;

exports.handler = async (event) => {
  // async function handler() {
  try {
    const res = await axios.get(query);
    const forecast = res.data.forecast.forecastday[0];
    const rawHourData = forecast.hour;

    function keyIn(key, values) {
      for (let value of values) {
        if (key === value) return true;
      }
      return false;
    }

    // Remove unwanted stuff
    let hourData = [];
    for (let hour of rawHourData) {
      const hourAsArray = Object.entries(hour);
      const filteredHour = hourAsArray.filter(([key, value]) =>
        keyIn(key, ["temp_f", "condition", "chance_of_rain", "chance_of_snow"])
      );
      const hourObj = Object.fromEntries(filteredHour);
      hourObj.condition = hourObj.condition.text;

      hourData.push([hour.time.split(" ")[1], hourObj]);
    }

    hourData = JSON.stringify(hourData.slice(START_HOUR, hourData.length - 1));

    const gpt3Prompt = `Wish me good morning and address me as "sir". Explain this weather forecast to me: ${hourData}`;

    const gptResponse = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: gpt3Prompt,
      temperature: 0.7,
      max_tokens: 256,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    const forecastMessage = gptResponse.data.choices[0].text;

    // Push GPT response to Twilio
    const twilioMessage = await twilioClient.messages.create({
      body: forecastMessage,
      from: Z5_NUMBER,
      to: JOE_NUMBER,
    });

    return {
      statusCode: 200,
      body: `Text message sent to ${JOE_NUMBER} with message: ${twilioMessage.body}`,
    };
  } catch (error) {
    console.log(error.message);
    return error.message;
  }
};
