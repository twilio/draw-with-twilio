Draw with Twilio
================

This application demonstrates the DataTrack feature in twilio-video.js. With it,
you can connect to a Room and draw on a shared "whiteboard" with other
Participants. Try it out at
[draw-with-twilio.appspot.com](https://draw-with-twilio.appspot.com).

![Screenshot](screenshot.png)

Install
-------

Before we begin, we need to collect three configuration values in order to run
the application:

* Account SID: Your primary Twilio account identifier; find this [in the console
  here](https://www.twilio.com/console)
* API Key SID: Used to authenticate; [generate one
  here](https://www.twilio.com/console/runtime/api-keys)
* API Key Secret: Used to authenticate; [just like the above, you'll get one
  here](https://www.twilio.com/console/runtime/api-keys)

Next, create a configuration file for the application:

```bash
cp .env.template .env
```

Edit `.env` with the configuration, and paste in the configuration values we
gathered above. Finally, run the following:

```
npm install
npm run build
npm start
```

Then, navigate to [localhost:9000](http://localhost:9000).
