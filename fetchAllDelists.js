const axios = require("axios");
const fs = require("fs");
const path = require("path");

const titlesFilePath = path.join(__dirname, "delist_titles_2024.json");

async function fetchDelistAnnouncements() {
  try {
    let allAnnouncements = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await axios.get(
        "https://api.bybit.com/v5/announcements/index",
        {
          params: {
            locale: "en-US",
            limit: 20,
            page: page,
          },
        }
      );

      if (response.data.retCode !== 0) {
        console.error(`Failed to get announcements: ${response.data.retMsg}`);
        return;
      }

      const announcements = response.data.result.list.filter((announcement) => {
        const year = new Date(announcement.dateTimestamp).getFullYear();
        return year === 2024 && announcement.type.key === "delistings";
      });

      const perpetualAnnouncements = announcements.filter((announcement) =>
        announcement.title.includes("Perpetual Contract")
      );

      const titles = perpetualAnnouncements.map((announcement) => {
        const date = new Date(announcement.dateTimestamp).toLocaleString();
        return { title: announcement.title, date: date };
      });

      allAnnouncements = allAnnouncements.concat(titles);
      page += 1;
      console.log(allAnnouncements.length);
      hasMore =
        response.data.result.list.length > 0 &&
        new Date(
          response.data.result.list[
            response.data.result.list.length - 1
          ].dateTimestamp
        ).getFullYear() >= 2024;
    }

    // Tüm duyuruları JSON dosyasına yazdır
    fs.writeFileSync(titlesFilePath, JSON.stringify(allAnnouncements, null, 2));
    console.log(`Delist announcements saved to ${titlesFilePath}`);

    console.log(
      `Total Delist Announcements in 2024: ${allAnnouncements.length}`
    );
  } catch (error) {
    console.error(
      "An error occurred while fetching delist announcements:",
      error.response ? error.response.data : error.message
    );
  }
}

// Fetch delist announcements
fetchDelistAnnouncements();

module.exports = fetchDelistAnnouncements;
