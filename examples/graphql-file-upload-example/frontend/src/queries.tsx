import { gql } from '@apollo/client';

export const GET_FILES = gql`
  query getFiles {
    files {
      filename
      thumbnailImage(width: 144, height: 72)
    }
  }
`;

export const UPLOAD_FILE = gql`
  mutation uploadFile($upload: File!) {
    uploadFile(upload: $upload) {
      filename
      thumbnailImage(width: 320, height: 240)
    }
  }
`;

export const DELETE_FILE = gql`
  mutation deleteFile($filename: String!) {
    deleteFile(filename: $filename)
  }
`;
