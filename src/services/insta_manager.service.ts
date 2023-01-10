import {ElementHandle, Page} from "puppeteer";
import axios from "axios";

export type Follower = { username: string, profile_pic_url: string, full_name: string }
export type GetFollowersResponse = {
    count: number,
    page_info: {has_next_page: boolean, end_cursor: any}
    edges: Array<{ node: Follower }>
}

export class InstaManagerService {
    private cookies: string | undefined;
    private appId: string | undefined;

    constructor(private readonly domain: string) {
        this.domain = domain;
    }

    private async fetch(url: string) {
        return axios(
            `${this.domain}/${url}`,
            {
                headers: {'x-ig-app-id': this.appId, "cookie": this.cookies},
            }
        )
    }

    private setCookies(cookies: Array<any>) {
        const cookiesArray = []
        for (const {name, value} of cookies) {
            if (name === 'sessionid' || name === 'ds_user_id') {
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
        if (usernameInput && passwordInput) {
            await usernameInput.type(username);
            await passwordInput.type(password);
            loginPage.on('request', (req: any) => {
                const {'x-ig-app-id': appId} = req.headers();
                if (appId) {
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

    async getUserInfo(nickname: string) {
        const response = await this.fetch(`api/v1/users/web_profile_info/?username=${nickname}`);
        return response.data.data.user;
    }

    async getFollowers(userId: string, lastUserId: string | null): Promise<GetFollowersResponse> {
        const variables = encodeURIComponent(
            JSON.stringify({
                id: userId,
                include_reel: true,
                fetch_mutual: true,
                first: 50,
                after: lastUserId,
            })
        );
        const {data: {data: {user: {edge_followed_by}}}} = await this.fetch(`graphql/query/?query_hash=c76146de99bb02f6415203be841dd25a&variables=${variables}`);
        return edge_followed_by;
    }

    async getFollowings(userId: string, lastUserId: string): Promise<GetFollowersResponse> {
        const variables = encodeURIComponent(
            JSON.stringify({
                id: userId,
                include_reel: true,
                fetch_mutual: true,
                first: 50,
                after: lastUserId,
            })
        );
        const {data: {data: {user: {edge_follow}}}} = await this.fetch(`graphql/query/?query_hash=d04b0a864b4b54837c0d870b0e77e076&variables=${variables}`);
        return edge_follow;
    }

    async getUnfollowed(followers: Array<Follower>, following: Array<Follower>) {
        const setOfFollowers = new Set(followers.map(follower => follower.username));
        return following.reduce((acc, following) => {
            if (!setOfFollowers.has(following.username)) {
                const {username, profile_pic_url, full_name} = following;
                acc.push({username, profile_pic_url, full_name})
            }
            return acc;
        }, [] as Array<any>);
    }
}
