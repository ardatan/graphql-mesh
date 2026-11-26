import type { NextApiRequest, NextApiResponse } from 'next';
import { getApolloServerHandler } from '../../server';

// `@as-integrations/next` reads `req.body` for Pages Router — keep Next's
// default JSON body parser enabled (unlike the old Micro stream handler).
export default async (req: NextApiRequest, res: NextApiResponse) => {
  return getApolloServerHandler(req, res);
};
