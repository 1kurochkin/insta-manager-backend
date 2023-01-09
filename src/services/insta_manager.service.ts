import {ElementHandle, Page} from "puppeteer";
import axios from "axios";

type Follower = {username: string, profile_pic_url: string, full_name: string}

export class InstaManagerService {
    private cookies: string | undefined;
    private appId: string | undefined;

    constructor(private readonly domain: string) {
        this.domain = domain;
    }

    private async fetch(url: string) {
        return axios(
            `${this.domain}/api/v1/${url}`,
            {
                headers: {'x-ig-app-id': this.appId, "cookie": this.cookies},
            }
        )
    }
    private setCookies(cookies: Array<any>) {
        const cookiesArray = []
        for (const {name, value} of cookies) {
            if(name === 'sessionid' || name === 'ds_user_id') {
                cookiesArray.push(`${name}=${value};`)
            }
        }
        this.cookies = cookiesArray.join(' ')
    }
    private setAppId(appId: string) {
        this.appId = appId;
    }

    async login(loginPage: Page, username: string, password: string) {
        // @ts-ignore
        const usernameInput = await loginPage.waitForSelector("input[name='username']");
        // @ts-ignore
        const passwordInput = await loginPage.waitForSelector("input[name='password']");
        if(usernameInput && passwordInput) {
            await usernameInput.type(username);
            await passwordInput.type(password);
            loginPage.on('request', (req:any) => {
                const {'x-ig-app-id': appId} = req.headers();
                if(appId) {
                    this.setAppId(appId)
                    loginPage.removeAllListeners('request')
                }
            });
            await loginPage.evaluate(() => {
                (document.querySelector('button[type=submit]') as unknown as ElementHandle).click();
            });
            await new Promise(r => setTimeout(r, 5000));
            this.setCookies(await loginPage.cookies());
        } else throw 'There are not inputs for sign in!'
    }
    async getUserInfo (nickname: string) {
        const response = await this.fetch(`users/web_profile_info/?username=${nickname}`);
        return response.data.data.user;
    }
    async getFollowers (userId: string, take:number, page:number) {
        const response = await this.fetch(`friendships/${userId}/followers/?count=${take}&max_id=${take * page}&search_surface=follow_list_page`);
        return response.data.users;
    }
    async getFollowings (userId: string, take:number, page:number) {
        const response = await this.fetch(`friendships/${userId}/following/?count=${take}&max_id=${take * page}`);
        return response.data.users;
    }
    async getUnfollowed (followers: Array<Follower>, following: Array<Follower>) {
        const setOfFollowers = new Set(followers.map(follower => follower.username));
        return following.reduce((acc, following) => {
            if(!setOfFollowers.has(following.username)) {
                const {username, profile_pic_url, full_name} = following;
                acc.push({username, profile_pic_url, full_name})
            }
            return acc;
        }, [] as Array<any>);
    }
    getHowManyTakeFromEachRequest(count:number) {
        const TAKE = 100;
       const [firstCountForTakeBy100, lastCountForTake] = `${count / TAKE}`.split('.');
       return [
           ...new Array(Number(firstCountForTakeBy100)).fill(TAKE),
           Number(lastCountForTake)
       ];
    }
}
