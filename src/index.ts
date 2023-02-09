import express, { Application, Request, Response } from "express";
import firebaseAdmin from "firebase-admin";
import appConfig from "./configs/app.config.json";
import firebaseConfig from "./configs/firebase.config.json";
import {
    Follower,
    InstaManagerService,
} from "./services/insta_manager.service";
const cors = require("cors");

export type GetUnfollowedResponseType = {
  user_info: {
    followers_count: number;
    followings_count: number;
    unfollowed_count: number;
  };
  unfollowed_list: Array<{
    username: string;
    profile_pic_url: string;
    full_name: string;
  }>;
};

type RemoteConfigType = {
  appId: { defaultValue: { value: string } };
  cookies: { defaultValue: { value: string } };
};

(async () => {
  try {
    // Initialize Firebase
    firebaseAdmin.initializeApp({
      //@ts-ignore
      credential: firebaseAdmin.credential.cert(firebaseConfig),
    });

    // Get Firebase Remote config
    const { parameters } = await firebaseAdmin.remoteConfig().getTemplate();
    const { appId, cookies } = parameters as RemoteConfigType;

    // INITIALIZATION INSTA-MANAGER-SERVICE
    const instaManagerService = new InstaManagerService(
      appConfig.instagram.domain,
      appId.defaultValue.value,
      cookies.defaultValue.value
    );

    // START SERVER
    const server: Application = express();
    server.use(express.json());
    server.use(cors({ origin: Number(process.env.IS_PROD) ? [] : "*" }));

    const router = express.Router();
    server.use("/api", router);

    router.get(
      "/unfollowed/:username",
      async (
        req: Request,
        res: Response
      ): Promise<GetUnfollowedResponseType | Express.Response | undefined> => {
        const { username } = req.params;
        try {
          //GET USERINFO FOR TAKE ID AND GET KNOW HOW MANY FOLLOWERS AND FOLLOWINGS USER HAS
          const { id: userId } = await instaManagerService.getUserInfo(
            username
          );
          if (!userId) return res.status(404);

          //GET ALL FOLLOWERS THAT USER HAS
          let followers: Array<Follower> = [];
          let followings: Array<Follower> = [];
          const loopConfig = ["getFollowers", "getFollowings"];
          for (const methodName of loopConfig) {
            let isHasNextPage = true;
            let lastUserId = null;
            while (isHasNextPage) {
              // @ts-ignore
              let response = await instaManagerService[methodName](
                userId,
                lastUserId
              );

              const {
                // @ts-ignore
                page_info: { has_next_page, end_cursor },
                edges,
              } = response;
              // IF GOT PROBLEMS WITH AUTHORIZATION
              if (end_cursor === null && edges.length === 0) {
              }
              const preparedUsers = edges.map(
                ({
                  node: { username, profile_pic_url, full_name },
                }: {
                  node: Follower;
                }) => ({
                  username,
                  profile_pic_url,
                  full_name,
                })
              );
              if (methodName === "getFollowers")
                followers = followers.concat(preparedUsers);
              else followings = followings.concat(preparedUsers);

              isHasNextPage = has_next_page;
              lastUserId = end_cursor;
            }
          }
          console.log(followers.length, followings.length);

          //COMPARE FOLLOWERS AND FOLLOWINGS FOR GET KNOW WHO UNFOLLOWED
          const unfollowed = await instaManagerService.getUnfollowed(
            followers,
            followings
          );
          //RETURN UNFOLLOWED USERS
          return res.json({
            user_info: {
              followers_count: followers.length,
              followings_count: followings.length,
              unfollowed_count: unfollowed.length,
            },
            unfollowed_list: unfollowed,
          });
        } catch (error: any) {
          console.log(error);
          res.json(error.message);
        }
      }
    );
    server.listen(appConfig.port, () => console.log(`Server is Running 👉`));
  } catch (error) {
    throw error;
  }
})();
