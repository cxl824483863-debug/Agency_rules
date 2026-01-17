/**
 * TMDB 剧集更新 Panel（Egern 专用）
 */

const TMDB_API_KEY = "92e05285c9b611b728e963fc7f3bb96b";
const TMDB_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI5MmUwNTI4NWM5YjYxMWI3MjhlOTYzZmM3ZjNiYjk2YiIsIm5iZiI6MTc2ODQwMDcyMi42MTc5OTk4LCJzdWIiOiI2OTY3YTc1MmVhZjg5YzIwMmE4NjY1NDMiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.crwmHTGpE_x5azP_O2lx6BaJt74Gk900XcR2A9Fvml4";

/**
 * 追剧列表
 * category 用于面板分类展示
 */
const SHOWS = [
  { id: 106379, name: "辐射", category: "美剧" },
  { id: 101172, name: "吞噬星空", category: "国漫" },
  { id: 67063,  name: "一人之下", category: "国漫" },
  { id: 249907, name: "判处勇者刑", category: "日漫" },
  { id: 139060, name: "魔都精兵的奴隶", category: "日漫" },
  { id: 30984,  name: "死神：千年血战", category: "日漫" },
  { id: 117465, name: "地狱乐", category: "日漫" }
];

const UPCOMING_DAYS = 7;

// =============== utils ===============
function httpGet(url) {
  return new Promise(resolve => {
    $httpClient.get(
      {
        url,
        timeout: 5000,
        headers: {
          Authorization: `Bearer ${TMDB_TOKEN}`,
          Accept: "application/json"
        }
      },
      (err, resp, body) => {
        if (err || !resp || resp.status !== 200) {
          resolve(null);
        } else {
          resolve(body);
        }
      }
    );
  });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function daysDiff(a, b) {
  return Math.ceil((new Date(b) - new Date(a)) / 86400000);
}

function cnDate(d) {
  const x = new Date(d);
  return `${x.getMonth() + 1}月${x.getDate()}日`;
}

// =============== main ===============
(async () => {
  const todayStr = today();

  const todayUpdated = [];
  const todayUpcoming = [];
  const future = [];

  // 并发请求 TMDB
  const tasks = SHOWS.map(s =>
    httpGet(
      `https://api.themoviedb.org/3/tv/${s.id}?api_key=${TMDB_API_KEY}&language=zh-CN`
    ).then(body => ({ meta: s, body }))
  );

  const results = await Promise.all(tasks);

  results.forEach(r => {
    if (!r.body) return;

    try {
      const show = JSON.parse(r.body);
      const meta = r.meta;

      const base = {
        name: show.name || meta.name,
        category: meta.category,
        rating: show.vote_average ? show.vote_average.toFixed(1) : "0.0",
        popularity: Math.round(show.popularity || 0)
      };

      // 今日已更新
      if (show.last_air_date === todayStr && show.last_episode_to_air) {
        const e = show.last_episode_to_air;
        todayUpdated.push({
          ...base,
          s: e.season_number,
          e: e.episode_number,
          t: e.name
        });
      }

      // 即将更新
      if (show.next_episode_to_air) {
        const e = show.next_episode_to_air;
        const d = daysDiff(todayStr, e.air_date);

        const item = {
          ...base,
          s: e.season_number,
          e: e.episode_number,
          t: e.name,
          d,
          ad: e.air_date
        };

        if (e.air_date === todayStr) {
          todayUpcoming.push(item);
        } else if (d > 0 && d <= UPCOMING_DAYS) {
          future.push(item);
        }
      }
    } catch (_) {}
  });

  // 按即将更新日期排序
  future.sort((a, b) => a.d - b.d);

  // =============== panel content ===============
  let content = "";

  if (todayUpdated.length) {
    content += "🎬 今日已更新\n";
    todayUpdated.forEach(i => {
      content += `【${i.name}｜${i.category}】\n`;
      content += `S${i.s}E${i.e} ${i.t}\n`;
      content += `⭐${i.rating} 🔥${i.popularity}\n\n`;
    });
  }

  if (todayUpcoming.length) {
    content += "⏰ 今日即将更新\n";
    todayUpcoming.forEach(i => {
      content += `【${i.name}｜${i.category}】\n`;
      content += `S${i.s}E${i.e} ${i.t}\n\n`;
    });
  }

  if (future.length) {
    content += "📅 即将更新\n";
    future.forEach(i => {
      const t = i.d === 1 ? "明天" : `${i.d}天后`;
      content += `【${i.name}｜${i.category}】${t}\n`;
      content += `S${i.s}E${i.e} · ${cnDate(i.ad)}\n`;
      content += `⭐${i.rating} 🔥${i.popularity}\n\n`;
    });
  }

  if (!content) content = "近期暂无剧集更新 😴";

  $done({
    title: "📺 追剧更新",
    content: content.trim(),
    icon: "tv",
    "icon-color": "#ff9500"
  });
})();