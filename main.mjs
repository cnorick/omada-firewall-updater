import "dotenv/config";
import { OmadaClient } from "./omada-client.mjs";

const client_id = process.env.OMADA_CLIENT_ID;
const client_secret = process.env.OMADA_CLIENT_SECRET;
const omadacId = process.env.OMADACID;
const baseUrl = process.env.OMADA_API_BASE_URL;
const siteId = process.env.OMADA_SITE_ID;
const groupId = process.env.OMADA_GROUP_ID;

const dataRefreshInterval = 30_000;

// See https://use1-omada-northbound.tplinkcloud.com/doc.html#/00%20All/Client/getGridActiveClients
const omada = new OmadaClient({ client_id, client_secret, omadacId, baseUrl });

let ipv6State = "disconnected";

async function main() {
  try {
    await checkIpV6AndUpdate();
  } catch (error) {
    console.error("Error:", error);
  }
  finally {
    console.log("------\n");
    setTimeout(main, dataRefreshInterval);
  }
}

async function updateWebhook(state) {
  if (state === ipv6State) {
    return;
  }
  ipv6State = state;

  const webhookUrl = process.env.IPV6_CONNECTION_STATE_WEBHOOK;
  if (!webhookUrl) {
    console.log("No webhook URL provided, skipping update.");
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state }),
    });
    if (!response.ok) {
      throw new Error(`Webhook update failed: ${response.statusText}`);
    }
    console.log("Webhook updated successfully:", state);
  } catch (error) {
    console.error("Error updating webhook:", error);
  }
}

async function updateOmada(ipv6) {
  const resp = await omada.patchGroupProfile(
    siteId,
    selectedGroup.type,
    groupId,
    {
      ...selectedGroup,
      ipv6List: [{ ...selectedGroup.ipv6List[0], ip: ipv6 }],
    }
  );
  if (resp.errorCode) {
    console.log("Failed to update IPv6:", resp);
    throw new Error("Failed to update IPv6 address");
  }
  console.log("Updated IPv6:", ipv6);
}

async function checkIpV6AndUpdate() {
  const groupList = await omada.getGroupProfileList(siteId);
  const selectedGroup = groupList.find((group) => group.groupId === groupId);
  if (!selectedGroup) {
    throw new Error(`Group with ID ${groupId} not found`);
  }

  let publicIpv6;
  try {
    publicIpv6 = await getPublicIPv6();
  }
  catch (error) {
    console.error("Error fetching public IPv6 address.");
    updateWebhook('disconnected');
    console.log(`Will retry in ${dataRefreshInterval / 1000} seconds.`);
    return;
  }
  updateWebhook('connected');

  const savedIPv6 = selectedGroup.ipv6List[0].ip;
  console.log("Saved IPv6:", savedIPv6);
  console.log("Public IPv6:", publicIpv6);

  if (savedIPv6 !== publicIpv6) {
    console.log("IPv6 has changed, updating...");
    updateOmada(publicIpv6);
  } else {
    console.log("IPv6 has not changed, no update needed.");
  }
}

async function getPublicIPv6() {
  // Tries these services in order, returning the first successful one.
  const services = [
    "https://ipv6.nsupdate.info/myip",
    "https://v6.ident.me",
    "https://ipv6.yunohost.org",
    "https://ipv6.wtfismyip.com/text",
  ];

  for (const service of services) {
    try {
      const response = await fetch(service);
      if (response.ok) {
        return await response.text();
      }
    } catch (error) {
      console.error(`Error fetching from ${service}`);
    }
  }

  throw new Error("No public IPv6 address found");
}

main();
