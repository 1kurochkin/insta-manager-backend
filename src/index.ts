import express, {Application, Request, Response} from 'express';
import puppeteer from "puppeteer";
import {Follower, InstaManagerService} from "./services/insta_manager.service";
import {config} from "./configs/config"

const initializationPuppeteer = async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(config.instagram.domain);
    return page;
}

(async () => {
    try {
        // INITIALIZATION PUPPETEER
        let instLoginPage = await initializationPuppeteer();

        // INITIALIZATION INSTA-MANAGER-SERVICE
        const instaManagerService = new InstaManagerService(config.instagram.domain);
        await instaManagerService.login(
            instLoginPage,
            config.instagram.credentials.username,
            config.instagram.credentials.password
        );

        // START SERVER
        const server: Application = express();
        server.use(express.json())

        server.post("/check", async (req: Request, res: Response) => {
            const {nickname} = req.body;
            try {
                //GET USERINFO FOR TAKE ID AND GET KNOW HOW MANY FOLLOWERS AND FOLLOWINGS USER HAS
                const {id: userId} = await instaManagerService.getUserInfo(nickname);

                //GET ALL FOLLOWERS THAT USER HAS
                let followers: Array<Follower> = [];
                let followings: Array<Follower> = [];
                const loopConfig = ['getFollowers', 'getFollowings']
                for (const methodName of loopConfig) {
                    let isHasNextPage = true;
                    let lastUserId = null;
                    while (isHasNextPage) {
                        // @ts-ignore
                        let response = await instaManagerService[methodName](userId, lastUserId);

                        const {   // @ts-ignore
                            page_info: {has_next_page, end_cursor},
                            edges
                        } = response;
                        // IF GOT PROBLEMS WITH AUTHORIZATION
                        if (end_cursor === null && edges.length === 0) {
                            instLoginPage = await initializationPuppeteer();
                            await instaManagerService.login(
                                instLoginPage,
                                config.instagram.credentials.username,
                                config.instagram.credentials.password,
                            );
                            // @ts-ignore
                            response = await instaManagerService[methodName](userId, lastUserId);
                        }
                        const preparedUsers = edges.map(
                            ({node: {username, profile_pic_url, full_name}}: { node: Follower }) => ({
                                username,
                                profile_pic_url,
                                full_name,
                            })
                        );
                        if (methodName === 'getFollowers') followers = followers.concat(preparedUsers)
                        else followings = followings.concat(preparedUsers)

                        isHasNextPage = has_next_page;
                        lastUserId = end_cursor;
                    }
                }
                //COMPARE FOLLOWERS AND FOLLOWINGS FOR GET KNOW WHO UNFOLLOWED
                const unfollowed = await instaManagerService.getUnfollowed(followers, followings);
                //RETURN UNFOLLOWED USERS
                res.json(unfollowed);
            } catch (error: any) {
                console.log(error);
                res.json(error.message);
            }
        });
        server.listen(config.port, () => console.log(`Server is Running 👉`))
    } catch (error) {
        throw error;
    }
})()