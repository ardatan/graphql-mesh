## YouTrack GraphQL API

![image](https://user-images.githubusercontent.com/20847995/79001969-29645080-7b58-11ea-87fb-01388c0cf286.png)
![image](https://user-images.githubusercontent.com/20847995/79002026-44cf5b80-7b58-11ea-8791-6e8633aaa9c4.png)
![image](https://user-images.githubusercontent.com/20847995/79002067-5add1c00-7b58-11ea-8129-0015009fee9e.png)

This example takes YouTrack as API Source and generates GraphQL Schema

You should have a YouTrack instance and a valid token.

See here;
https://www.jetbrains.com/help/youtrack/standalone/Manage-Permanent-Token.html#obtain-permanent-token

You need to pass two environmental variables to run this project with the command `yarn start`;

- `YOUTRACK_SERVICE_URL` is your YouTrack service URL. If you are using the cloud, you have a URL
  something like this; `https://ardatan.myjetbrains.com/youtrack`
- `YOUTRACK_TOKEN` is your YouTrack token to access YouTrack service using REST API. If it is a
  permenant token, it should be something like
  `perm:XXXXXX==XXXXXXX==XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

Then run this project with the following command;

```sh
YOUTRACK_SERVICE_URL={YOUR_API_URL_HERE} YOUTRACK_TOKEN={YOUR TOKEN IS HERE} yarn start
```
