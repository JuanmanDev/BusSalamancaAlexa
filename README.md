# Bus Salamanca Alexa Skill

![Alexa Skill](https://m.media-amazon.com/images/G/01/mobile-apps/dex/alexa/alexa-skills-kit/tutorials/quiz-game/header._TTH_.png)

## 📝 Description

Bus Salamanca is an Alexa skill that provides real-time information about bus schedules and arrivals in Salamanca, Spain. The skill allows users to ask when the next bus will arrive at a specific stop or get information about bus routes.

You can download and install the skill from the Amazon Alexa Skills Store:
[Bus Salamanca on Amazon](https://www.amazon.es/Juan-Manuel-B%C3%A9c-Bus-Salamanca/dp/B0F59TDK93/)

**GitHub Repository:** [https://github.com/JuanmanDev/BusSalamancaAlexa/](https://github.com/JuanmanDev/BusSalamancaAlexa/)

## ⚠️ Disclaimer

This project is **not affiliated** with "Salamanca de Transportes" company or the City Council of Salamanca. It's an independent project that uses publicly available data to provide a service to bus users.

## 🏗️ Architecture

The project follows this architecture:

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│              │      │              │      │              │
│  Alexa Skill │─────▶│  AWS Lambda  │─────▶│  SIRI API    │
│              │      │              │      │              │
└──────────────┘      └──────────────┘      └──────────────┘
       ▲                                            │
       │                                            │
       └────────────────────────────────────────────┘
                        Response
```

## 🔧 Technical Details

- Built with TypeScript and Node.js
- Deployed as an AWS Lambda function
- Uses the SIRI (Service Interface for Real Time Information) API to get bus data
- Implements the Alexa Skills Kit for voice interaction

## 🚀 CI/CD Pipeline

This project uses GitHub Actions for continuous integration and deployment:

```
┌──────────┐     ┌──────────┐     ┌───────────┐     ┌──────────┐
│          │     │          │     │           │     │          │
│   Code   │────▶│   Test   │────▶│   Build   │────▶│  Deploy  │
│          │     │          │     │           │     │          │
└──────────┘     └──────────┘     └───────────┘     └──────────┘
```

The CI/CD pipeline automatically:
1. Runs tests when code is pushed to the main branch
2. Builds the TypeScript code
3. Deploys the code to AWS Lambda
4. Updates the Alexa skill

The workflow configuration is located in `.github/workflows/deploy-lambda.yml`.

## 🛠️ Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/BusSalamancaAlexa.git
   cd BusSalamancaAlexa
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Generate SIRI API types (this is not required as it is improved by fetch file):
   ```bash
   # Download WSDL if you haven't already
   # The WSDL file is already included in the repository as SiriWS.xml
   
   # Generate TypeScript types from WSDL
   npx wsdl-tsclient ./SiriWS.xml -o ./generated/
   ```

4. Build the project:
   ```bash
   npm run build
   ```

## 🧪 Testing

### Test the frontend interface

You can test the data received by running:

```bash
npx ts-node src/fe.ts
```

This will start a local server that simulates the Alexa frontend interaction.

### Test with Alexa Simulator

You can also test the skill using the Alexa Developer Console simulator.

## 📦 Deployment

The project is automatically deployed through GitHub Actions. If you want to manually deploy:

1. Build the project:
   ```bash
   npm run build
   ```

2. Deploy to AWS Lambda:
   ```bash
   # Using AWS CLI
   aws lambda update-function-code --function-name BusSalamancaAlexa --zip-file fileb://dist.zip
   ```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
