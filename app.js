const WebUntis = require("webuntis");
const Influx = require("influx");
const os = require("os");

const untis = new WebUntis(
  "K%C3%A4the-Kollwitz-Gymnasium",
  "10.3",
  "Kaethe-10-3",
  "neilo.webuntis.com"
);

let date = new Date();

function dedupe(arr) {
  return arr.reduce(
    function (p, c) {
      // create an identifying id from the object values
      var id = [c.x, c.y].join("|");

      // if the id is not found in the temp array
      // add the object to the output array
      // and add the key to the temp array
      if (p.temp.indexOf(id) === -1) {
        p.out.push(c);
        p.temp.push(id);
      }
      return p;

      // return the deduped array
    },
    {
      temp: [],
      out: [],
    }
  ).out;
}

let today = [];

untis
  .login()
  .then(() => {
    return untis.getOwnTimetableForToday();
  })
  .then((timetable) => {
    timetable.forEach((t) => {
      let now = {};
      switch (t.startTime) {
        case 800:
          now.block = 1;
          break;
        case 940:
          now.block = 2;
          break;
        case 1115:
          now.block = 3;
          break;
        case 1320:
          now.block = 4;
          break;
        default:
          break;
      }
      now.name = t.su[0].longname;
      today.push(now);
    });

    // remove duplicates
    today = Array.from(new Set(today.map((a) => a.name))).map((name) => {
      return today.find((a) => a.name === name);
    });

    // clean up WPU
    for (let i = 0; i < today.length; i++) {
      if (
        !today[i].block ||
        today[i].name === "Ufo" ||
        today[i].name === "Latein" ||
        date.getDay() === 3 ||
        (date.getDay() === 4 &&
          (today[i].name === "Biologie" ||
            today[i].name === "Physik" ||
            today[i].name === "Erdkunde" ||
            today[i].name === "Englisch" ||
            today[i].name === "Mathematik" ||
            today[i].name === "DS") &&
          today[i].block === 1)
      ) {
        today.splice(i, 1);
        i--;
      }
    }

    // sort by block
    today.sort(function (a, b) {
      return a.block - b.block;
    });

    console.log(today);

    today.forEach((val) => {
      const influx = new Influx.InfluxDB({
        host: "localhost",
        database: "untis",
        schema: [
          {
            measurement: "webuntis-10-3",
            fields: {
              name: Influx.FieldType.STRING,
            },
            tags: ["host", "block"],
          },
        ],
      });

      influx.writePoints([
        {
          measurement: "webuntis-10-3",
          tags: { host: os.hostname(), block: val.block },
          fields: { name: val.name },
        },
      ]);
    });
  });
