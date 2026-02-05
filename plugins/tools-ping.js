const { totalmem, freemem, cpus, platform, hostname, type, arch, release, uptime } = require('os');
const { performance } = require('perf_hooks');
const { sizeFormatter } = require('human-readable');

const format = sizeFormatter({
  std: 'JEDEC',
  decimalPlaces: 2,
  keepTrailingZeroes: false,
  render: (literal, symbol) => `${literal} ${symbol}B`,
});

let handler = async (m, { conn }) => {
  const chats = Object.entries(conn.chats).filter(([id, data]) => id && data.isChats);
  const groupsIn = chats.filter(([id]) => id.endsWith('@g.us'));
  const used = process.memoryUsage();

  const _cpus = cpus().map(cpu => {
    cpu.total = Object.keys(cpu.times).reduce((last, type) => last + cpu.times[type], 0);
    return cpu;
  });

  const cpu = _cpus.reduce(
    (last, cpu, _, { length }) => {
      last.total += cpu.total;
      last.speed += cpu.speed / length;
      last.times.user += cpu.times.user;
      last.times.nice += cpu.times.nice;
      last.times.sys += cpu.times.sys;
      last.times.idle += cpu.times.idle;
      last.times.irq += cpu.times.irq;
      return last;
    },
    {
      speed: 0,
      total: 0,
      times: {
        user: 0,
        nice: 0,
        sys: 0,
        idle: 0,
        irq: 0,
      },
    }
  );

  const muptime = clockString(process.uptime() * 1000);
  const old = performance.now();
  await conn.reply(m.chat, '_Testing speed..._', m);
  const neww = performance.now();
  const speed = (neww - old).toFixed(4);

  const d = new Date(new Date().getTime() + 3600000);
  const locale = 'id';
  const times = d.toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric'
  });

  let txt = `*ᴘ ɪ ɴ ɢ*
${speed} ms

*ʀ ᴜ ɴ ᴛ ɪ ᴍ ᴇ* 
${muptime}

*ᴄ ʜ ᴀ ᴛ s*
• *${groupsIn.length}* Group Chats
• *${groupsIn.length}* Groups Joined
• *0* Groups Left
• *${chats.length - groupsIn.length}* Personal Chats
• *${chats.length}* Total Chats

*s ᴇ ʀ ᴠ ᴇ ʀ*
*🛑 ʀᴀᴍ:* ${format(totalmem() - freemem())} / ${format(totalmem())}
*🔵 ғʀᴇᴇRAM:* ${format(freemem())}
*🔴 ᴄᴘᴜ ᴛʏᴘᴇ:* ${_cpus[0].model}
* Telescope ᴘʟᴀᴛғᴏʀᴍ:* ${platform()}
*🧿 sᴇʀᴠᴇʀ:* ${hostname()}
*💻 ᴏs:* ${type()} ${arch()} ${release()}
*⏰ ᴛɪᴍᴇ sᴇʀᴠᴇʀ:* ${times}

_NodeJS Memory Usage_
${
  "```" +
  Object.keys(used)
    .map(
      (key, _, arr) =>
        `${key.padEnd(Math.max(...arr.map((v) => v.length)), " ")}: ${format(
          used[key]
        )}`
    )
    .join("\n") +
  "```"
}

${
  _cpus[0]
    ? `_Total CPU Usage_
${_cpus[0].model.trim()} (${cpu.speed.toFixed(0)} MHZ)\n${Object.keys(cpu.times)
        .map(
          (type) =>
            `- *${(type + "*").padEnd(6)}: ${(
              (100 * cpu.times[type]) /
              cpu.total
            ).toFixed(2)}%`
        )
        .join("\n")}

_CPU Core(s) Usage (${_cpus.length} Core CPU)_
${_cpus
  .map(
    (cpu, i) =>
      `${i + 1}. ${cpu.model.trim()} (${cpu.speed} MHZ)\n${Object.keys(
        cpu.times
      )
        .map(
          (type) =>
            `- *${(type + "*").padEnd(6)}: ${(
              (100 * cpu.times[type]) /
              cpu.total
            ).toFixed(2)}%`
        )
        .join("\n")}`
  )
  .join("\n\n")}`
    : ""
}
`;

  conn.relayMessage(m.chat, {
    extendedTextMessage: {
      text: txt,
      contextInfo: {
        externalAdReply: {
          title: `Server Status - ${speed}ms`,
          mediaType: 1,
          previewType: 0,
          renderLargerThumbnail: true,
          thumbnailUrl: 'https://telegra.ph/file/ec8cf04e3a2890d3dce9c.jpg',
          sourceUrl: ''
        }
      },
      mentions: [m.sender]
    }
  }, {});
};

handler.help = ['ping', 'speed'];
handler.tags = ['info'];
handler.command = /^(ping|speed|pong|ingfo)$/i;
handler.register = true;

module.exports = handler;

function clockString(ms) {
  let d = isNaN(ms) ? '--' : Math.floor(ms / 86400000);
  let h = isNaN(ms) ? '--' : Math.floor(ms / 3600000) % 24;
  let m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60;
  let s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60;
  return [d, 'D ', h, 'H ', m, 'M ', s, 'S '].map(v => v.toString().padStart(2, '0')).join('');
}
