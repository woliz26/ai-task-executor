
        const express = require('express');

        const app = express();

        app.get('/', (req, res) => {
          res.json({
            status: 'ok',
            generated: true
          });
        });

        app.listen(3000, () => {
          console.log('Generated API running');
        });
      