import { NextApiRequest, NextApiResponse } from 'next';
import { getApolloServerHandler } from '../../server';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async (req: NextApiRequest, res: NextApiResponse) => {
  return getApolloServerHandler(req, res);
};
