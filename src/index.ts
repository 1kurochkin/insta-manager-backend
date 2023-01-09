import express, {Application, Request, Response} from 'express';
import puppeteer, {Page} from "puppeteer";
import {InstaManagerService} from "./services/insta_manager.service";
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
        // await instaManagerService.login(
        //     instLoginPage,
        //     config.instagram.credentials.username,
        //     config.instagram.credentials.password
        // );

        // START SERVER
        const server: Application = express();
        server.use(express.json())

        server.post("/check", async (req: Request, res: Response) => {
            const { nickname } = req.body;
            try {
                //GET USERINFO FOR TAKE ID AND GET KNOW HOW MANY FOLLOWERS AND FOLLOWINGS USER HAS
                const {id, edge_followed_by, edge_follow} = await instaManagerService.getUserInfo(nickname);

                //GET ALL FOLLOWERS THAT USER HAS
                const arrayOfCountOfTakeFollowers = instaManagerService.getHowManyTakeFromEachRequest(edge_followed_by.count);
                const followers = await Promise.all(
                    arrayOfCountOfTakeFollowers.map((take, page) => instaManagerService.getFollowers(id, take, page))
                );

                //GET ALL FOLLOWINGS THAT USER HAS
                const arrayOfCountOfTakeFollowings = instaManagerService.getHowManyTakeFromEachRequest(edge_follow.count);
                const followings = await Promise.all(
                    arrayOfCountOfTakeFollowings.map((take, page) => instaManagerService.getFollowings(id, take, page))

                );

                // MATCH FOLLOWERS AND FOLLOWINGS FOR GET KNOW WHO UNFOLLOWED
                const unfollowed = await instaManagerService.getUnfollowed(followers.flat(), followings.flat());

                // RETURN UNFOLLOWED USERS
                res.json(unfollowed);
            } catch (error: any) {
                if(error.message.includes(500) || error.message.includes(401)) {
                    console.log('HELLO ERROR 401')
                    instLoginPage = await initializationPuppeteer();
                    await instaManagerService.login(
                        instLoginPage,
                        config.instagram.credentials.username,
                        config.instagram.credentials.password,
                    );
                    res.json('Sorry about this! Try again please!')
                } else {
                    res.json(error.message);
                }
            }
        });
        server.listen(config.port, () => console.log(`Server is Running 👉`))
    } catch (error) {
        throw error;
    }
})()