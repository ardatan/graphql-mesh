import { useMutation, useQuery } from '@apollo/client';
import { GET_FILES, DELETE_FILE } from './queries';

export default function Files() {
  const { loading, error, data } = useQuery(GET_FILES);
  const [deleteFile] = useMutation(DELETE_FILE);

  if (loading) return 'Loading...';
  if (error) return `Error! ${error.message}`;

  return (
    <ul>
      {data?.files.map(({ filename, thumbnailImage }) => {
        const extension = filename.split('.').pop();
        const uri = `data:image/${extension};base64,${thumbnailImage}`;
        return (
          <li key={filename}>
            <img src={uri} alt={filename} />
            <button
              onClick={() => {
                deleteFile({
                  variables: {
                    filename,
                  },
                  update(cache) {
                    const data = cache.readQuery({
                      query: GET_FILES,
                    });
                    cache.writeQuery({
                      query: GET_FILES,
                      data: {
                        ...data,
                        files: data.files.filter(image => image.filename !== filename),
                      },
                    });
                  },
                });
              }}
            >
              Delete
            </button>
          </li>
        );
      })}
    </ul>
  );
}
