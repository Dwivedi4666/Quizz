const express = require("express");
const cors = require("cors");
const app = express();
const fs = require("fs");

///////////////////////////////////
const replaceTemplate = (temp, question) => {
  let output = temp.replace(/{%OPTION1%}/g, question.options[0].text);
  output = output.replace(/{%OPTION2%}/g, question.options[1].text);
  output = output.replace(/{%OPTION3%}/g, question.options[2]?.text || "");
  output = output.replace(/{%OPTION4%}/g, question.options[3]?.text);

  output = output.replace(/{%EXPLANATION1%}/g, question.options[0].text);
  output = output.replace(/{%EXPLANATION2%}/g, question.options[1].text);
  output = output.replace(/{%EXPLANATION3%}/g, question.options[2]?.text || "");
  output = output.replace(/{%EXPLANATION4%}/g, question.options[3]?.text);

  output = output.replace(/{%QUESTION%}/g, question.question);

  for (let i = 0; i < question.options.length; i = i + 1) {
    if (question.answer === question.options[i].id) {
      output = output.replace(`{%CORRECT${i + 1}%}`, "correct");
    } else {
      output = output.replace(`{%CORRECT${i + 1}%}`, "");
    }
  }

  return output;
};

const idConvert = (el) => {
  bufferData = el._id.buffer.data;
  const hexString = Buffer.from(bufferData).toString("hex");
  return hexString;
};

const quesConvert = (ques) => {
  const questionTemp = ques.map((el) => {
    const lotItems = el.lotItems.map((item) => {
      return { ...item, _id: idConvert(item) };
    });
    return { ...el, _id: idConvert(el), lotItems };
  });
  const questions = questionTemp.map((q) => {
    const tempObj = Object.assign({
      question: q.text,
      options: q.lotItems.map((opt) =>
        Object.assign({
          id: opt._id,
          text: opt.text,
          explaination: opt.explaination,
        }),
      ),
    });

    const answer = tempObj.options.filter((opt) =>
      opt.explaination.includes("Correct"),
    );
    tempObj.answer = answer.length == 1 ? answer[0].id : "";
    return tempObj;
  });

  return questions;
};
////////////////////////////////

app.use(cors());

app.use(express.json());

app.post("/capture", (req, res) => {
  console.log("---Received Body from /attempt ---");

  const questions = req.body.data.questionRenderViews;

  questions.forEach((q, qi) => {
    console.log(`\nQuestion ${qi + 1}: ${q.text}`);

    q.lotItems.forEach((item, oi) => {
      console.log(`  Option ${oi + 1}: ${item.text}`);
      console.log(`  Explanation: ${item.explaination}`);
      console.log("   ");
    });
  });

  fs.writeFileSync(
    `${__dirname}/data/data.json`,
    JSON.stringify(req.body, null, 2),
  );
  console.log("--------------------------------");
  res.status(200).send("Data Captured");
});

app.get("/", (req, res) => {
  const templateQuestion = fs.readFileSync(
    `${__dirname}/template/template-question.html`,
    "utf-8",
  );

  const templateCard2 = fs.readFileSync(
    `${__dirname}/template/template-card2.html`,
    "utf-8",
  );

  const templateCard4 = fs.readFileSync(
    `${__dirname}/template/template-card4.html`,
    "utf-8",
  );

  const data = fs.readFileSync(`${__dirname}/data/data.json`, "utf-8");
  const dataObj = JSON.parse(data);

  const pathName = req.url;
  console.log(pathName);

  const questions = quesConvert(dataObj.data.questionRenderViews);
  fs.writeFileSync(
    `${__dirname}/data/data2.json`,
    JSON.stringify(questions, null, 2),
  );

  const cardHtml = questions
    .map((question) =>
      replaceTemplate(
        question.options.length === 2 ? templateCard2 : templateCard4,
        question,
      ),
    )
    .join("");

  let output = templateQuestion.replace(/{%QUESTION_CARDS%}/g, cardHtml);

  res.status(200).send(output);
});

app.listen(3000, () => console.log("Listening on Port:3000"));
