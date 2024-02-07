import { createServer } from 'http';
import { vaccinationApi } from './api';

createServer(vaccinationApi).listen(4001, () => {
  console.log('Vaccination API started at http://localhost:4001');
});
