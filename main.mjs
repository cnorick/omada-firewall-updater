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


async function main() {
  const groupList = await omada.getGroupProfileList(siteId);
  const selectedGroup = groupList.find((group) => group.groupId === groupId);
  if (!selectedGroup) {
    throw new Error(`Group with ID ${groupId} not found`);
  }

  const publicIpv6 = await getPublicIPv6();
  const savedIPv6 = selectedGroup.ipv6List[0].ip;
  console.log("Saved IPv6:", savedIPv6);
  console.log("Public IPv6:", publicIpv6);

  if (savedIPv6 !== publicIpv6) {
    console.log("IPv6 has changed, updating...");
    const resp = await omada.patchGroupProfile(
      siteId,
      selectedGroup.type,
      groupId,
      {
        ...selectedGroup,
        ipv6List: [{ ...selectedGroup.ipv6List[0], ip: publicIpv6 }],
      }
    );
    if (resp.errorCode) {
      console.log("Failed to update IPv6:", resp);
      throw new Error("Failed to update IPv6 address");
    }
    console.log("Updated IPv6:", publicIpv6);
  } else {
    console.log("IPv6 has not changed, no update needed.");
  }
  console.log("------\n");
  setTimeout(main, dataRefreshInterval);
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
      console.error(`Error fetching from ${service}:`, error);
    }
  }

  throw new Error("No public IPv6 address found");
}

main();
