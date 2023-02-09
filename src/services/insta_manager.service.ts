import axios from "axios";

export type Follower = {
  username: string;
  profile_pic_url: string;
  full_name: string;
};
export type GetFollowersResponse = {
  count: number;
  page_info: { has_next_page: boolean; end_cursor: any };
  edges: Array<{ node: Follower }>;
};

export class InstaManagerService {
  constructor(
    private readonly domain: string,
    private readonly appId: string,
    private readonly cookies: string
  ) {
    this.domain = domain;
    this.appId = appId;
    this.cookies = cookies;
  }

  private async fetch(url: string) {
      console.log(this.cookies , this.appId);
      
    return axios(`${this.domain}/${url}`, {
      headers: {
          "x-ig-app-id": this.appId, 
          "cookie": this.cookies 
      },
    });
  }

  async getUserInfo(nickname: string) {
    const response = await this.fetch(
      `api/v1/users/web_profile_info/?username=${nickname}`
    );
    return response.data.data.user;
  }

  async getFollowers(
    userId: string,
    lastUserId: string | null
  ): Promise<GetFollowersResponse> {
    const variables = encodeURIComponent(
      JSON.stringify({
        id: userId,
        include_reel: true,
        fetch_mutual: true,
        first: 50,
        after: lastUserId,
      })
    );
    const response = await this.fetch(
      `graphql/query/?query_hash=c76146de99bb02f6415203be841dd25a&variables=${variables}`
    );
    console.log(response);
    const {
        data: {
          data: {
            user: { edge_followed_by },
          },
        },
      } = response;
    
    return edge_followed_by;
  }

  async getFollowings(
    userId: string,
    lastUserId: string
  ): Promise<GetFollowersResponse> {
    const variables = encodeURIComponent(
      JSON.stringify({
        id: userId,
        include_reel: true,
        fetch_mutual: true,
        first: 50,
        after: lastUserId,
      })
    );
    const {
      data: {
        data: {
          user: { edge_follow },
        },
      },
    } = await this.fetch(
      `graphql/query/?query_hash=d04b0a864b4b54837c0d870b0e77e076&variables=${variables}`
    );
    return edge_follow;
  }

  async getUnfollowed(followers: Array<Follower>, following: Array<Follower>) {
    const setOfFollowers = new Set(
      followers.map((follower) => follower.username)
    );
    return following.reduce((acc, following) => {
      if (!setOfFollowers.has(following.username)) {
        const { username, profile_pic_url, full_name } = following;
        acc.push({ username, profile_pic_url, full_name });
      }
      return acc;
    }, [] as Array<any>);
  }
}
