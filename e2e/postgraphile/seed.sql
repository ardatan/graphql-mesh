-- Sample seed data for the PostGraphile e2e test
CREATE TABLE IF NOT EXISTS author (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  bio TEXT
);

CREATE TABLE IF NOT EXISTS book (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  author_id INTEGER REFERENCES author(id),
  year INTEGER
);

INSERT INTO author (name, bio) VALUES
  ('J.R.R. Tolkien', 'English author of high fantasy'),
  ('George Orwell', 'English novelist and essayist');

INSERT INTO book (title, author_id, year) VALUES
  ('The Lord of the Rings', 1, 1954),
  ('The Hobbit', 1, 1937),
  ('1984', 2, 1949),
  ('Animal Farm', 2, 1945);
