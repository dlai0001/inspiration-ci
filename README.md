# inspiration-ci
### a Sails application for monitoring TeamCity builds.

----

Displays an inspirational poster image when builds are succeeding.  Project status are streamed in a carousel below.  When builds are running, only the running builds are displayed in the carousel.  When there is a failing build, the inspirational image disappears and you see a list of failing builds on a red background.


To setup:

Requires:
* NodeJS
* SailsJS

Configure your teamcity API endpoint in the /configs/teamcity.js config.

Install dependencies.

      npm install


Launch server

      sails lift


Open your browser to http://localhost:1337 and maximize the browser to full screen and see you builds displayed.


About:

This was just a fun project to get to know angular and working with pub/sub in angular apps.  I don't intend on maintaining this as a supported project, but pull requests and suggestions are welcome.
