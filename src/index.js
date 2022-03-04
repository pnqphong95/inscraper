import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import { IgAuthService } from './services/authentication_service.js';
import * as Constant from './constant.js';
import * as MediaQueryHelper from './helpers/media_query_helper.js';
import { UserService } from './services/user_service.js';
import { MediaService } from './services/media_service.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.sendStatus(200);
});

app.post('/login', async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const authService = new IgAuthService();
  authService.authenticate({ username, password })
    .then(auth => res.json(auth))
    .catch(error => res.status(error.status).json(error.json()));
});

app.post('/logout', async (req, res) => {
  res.sendStatus(200);
});

app.post('/users/:username', async (req, res) => {
  const body = req.body;
  if (body && body.csrfToken && body.requestCookie) {
    const userService = new UserService(body.csrfToken, body.requestCookie);
    const user = await userService.getUserInfomation(req.params.username);
    if (user.timeline_media_count && user.id) {
      const newMediaCount = MediaQueryHelper.calculateNewMediaCount(user.timeline_media_count, body.last_timeline_media_count);
      userService.getMediasByDesiredCount(user, newMediaCount)
        .then(data => res.json({ user, new_media_count: newMediaCount, data }))
        .catch(error => {
          if (error.response) {
            res.status(error.response.status).send(error.response.data);
          } else {
            res.status(500).send(error.message);
          }
        });
    } else {
      res.status(500).send('Unable to get user fron Instagram, please check log for details.');
    }
  } else {
    res.sendStatus(400);
  }
});

app.post('/medias', async (req, res) => {
  const body = req.body;
  const timeout = body.timeoutInSecond;
  const shortcodes = body.shortcodes;
  const user = body.user
  if (body && body.csrfToken && body.requestCookie) {
    const mediaService = new MediaService(body.csrfToken, body.requestCookie);
    const result = await mediaService.viewMedias(shortcodes, timeout);
    res.json({ user, remains: result.remains, data: result.data, error_remains: result.error_remains });
  } else {
    res.sendStatus(400);
  }
});

app.listen(Constant.APP_PORT, () =>
  console.log(`Inscraper app listening on port ${Constant.APP_PORT}!`),
);

