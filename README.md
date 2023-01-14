Gets weather from free API, feeds through OpenAI GPT3, then texts my phone a summary of the weather forecast every morning at 8 am via Twilio. Running on AWS Lambda and triggered by AWS EventBridge.

To zip: `zip -r dailyweather.zip * `
