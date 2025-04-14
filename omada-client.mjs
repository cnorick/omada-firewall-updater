process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

export class OmadaClient {
  constructor({ client_id, client_secret, omadacId, baseUrl }) {
    this.client_id = client_id;
    this.client_secret = client_secret;
    this.omadacId = omadacId;
    this.baseUrl = baseUrl;
  }

  async getClientList(siteId, page = 1, pageSize = 100) {
    const resp = await this._get(
      `v1/${this.omadacId}/sites/${siteId}/clients?page=${page}&pageSize=${pageSize}`
    );
    return await resp.json();
  }

  async getAllClients(siteId) {
    let page = 1;
    const allClients = [];
    let clientsResult;
    do {
      const clientsResp = await this.getClientList(siteId, page);
      clientsResult = clientsResp.result;
      allClients.push(...clientsResult.data);
      page++;
    } while (allClients.length < clientsResult.totalRows);

    return allClients;
  }

  async getSiteList(page = 1, pageSize = 100) {
    const resp = await this._get(
      `v1/${this.omadacId}/sites?page=${page}&pageSize=${pageSize}`
    );
    return (await resp.json()).result.data;
  }

  async getGroupProfileList(siteId) {
    const resp = await this._get(
      `v1/${this.omadacId}/sites/${siteId}/profiles/groups`
    );
    return (await resp.json()).result;
  }

  async patchGroupProfile(siteId, groupType, groupId, data) {
    const resp = await this._patch(
      `v1/${this.omadacId}/sites/${siteId}/profiles/groups/${groupType}/${groupId}`,
      data
    );
    return await resp.json();
  }

  async _getAccessToken() {
    const tokenResponse = await fetch(
      `${this.baseUrl}/authorize/token?grant_type=client_credentials`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          omadacId: this.omadacId,
          client_id: this.client_id,
          client_secret: this.client_secret,
        }),
      }
    );

    return (await tokenResponse.json()).result.accessToken;
  }

  async _get(endpoint) {
    const accessToken = await this._getAccessToken();
    return await fetch(`${this.baseUrl}/${endpoint}`, {
      method: "GET",
      headers: {
        "content-type": "application/json",
        Authorization: `AccessToken=${accessToken}`,
      },
    });
  }

  async _patch(endpoint, data) {
    const accessToken = await this._getAccessToken();
    return await fetch(`${this.baseUrl}/${endpoint}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        Authorization: `AccessToken=${accessToken}`,
      },
      body: JSON.stringify(data),
    });
  }
}
