const express = require('express');

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
    res.send('API is running...');
})

app.listen(3000, () => {
    console.log("app listening on http://localhost:3000");
})