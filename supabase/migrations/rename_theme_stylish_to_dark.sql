-- diagrams.theme の値 'stylish' を 'dark' に移行
UPDATE diagrams SET theme = 'dark' WHERE theme = 'stylish';
ALTER TABLE diagrams ALTER COLUMN theme SET DEFAULT 'dark';
