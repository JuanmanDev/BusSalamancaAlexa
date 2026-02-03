import fetch from 'node-fetch';

async function testLaunchRequest() {
    const launchRequest = {
        "version": "1.0",
        "session": {
            "new": true,
            "sessionId": "amzn1.echo-api.session.test",
            "application": {
                "applicationId": "amzn1.ask.skill.test"
            },
            "user": {
                "userId": "amzn1.ask.account.TEST"
            }
        },
        "context": {
            "System": {
                "application": {
                    "applicationId": "amzn1.ask.skill.test"
                },
                "user": {
                    "userId": "amzn1.ask.account.TEST"
                },
                "device": {
                    "supportedInterfaces": {}
                }
            }
        },
        "request": {
            "type": "LaunchRequest",
            "requestId": "amzn1.echo-api.request.test",
            "timestamp": new Date().toISOString(),
            "locale": "es-ES"
        }
    };

    try {
        const response = await fetch('http://localhost:3000/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(launchRequest)
        });

        const data = await response.json();
        console.log('Response status:', response.status);
        console.log('Response body:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

testLaunchRequest();
