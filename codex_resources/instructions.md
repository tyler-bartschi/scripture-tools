Your goal is to help build a simple scripture tool website. This website will have the following constraints:

- It will not be deployed publicly, and will only be available on localhost through running npm run dev or npm start.
- It will use a local mysql instance to persist data, details about the mysql instance are found in the `db.config` file.

Please implement the following:

Build simple, asthetically pleasing webpage using React and Typescript. This webpage
allows me to enter different names of Heavenly Father, Jesus Christ, and the Holy Ghost,
along with which standard work it comes from and which verse it is in. It will save
this data in the mysql database `scriptures` which has already been set up, the details
of this database can be found in the `codex_resources/database_details.md` file.

When inputting a name/title, it should allow me to select and input certain values:

1. Select the name of the member of the Godhead, constrained to: Heavenly Father, Jesus Christ, or the Holy Ghost

2. Select the standard work it appears in, constrained to: Old Testament, New Testament, Book of Mormon, the Doctrine and Covenants, and the Pearl of Great Price. This should default to the Book of Mormon.

3. Input the name/title: plain text input, letting me type in whatever the name/title is.

4. Verse: An input field that accepts text, and parses it. The text should be entered in the
following format: book_of_scripture chapter: verse. An example is 1 Nephi 13: 15. It does 
not need to verify that the book or verse exists, but it should parse the input to properly 
find the book, chapter, and verse. The chapter will always be directly followed by a `:` and
the verse will be the last item in the string. If a string is input that does not follow this
form, reject it an notify the user.


Once this information is input, the user can click a "submit" button to submit this
data. The submitted data should be loaded into the appropriate database tables, if this
operation fails display an error message to the user and do not clear the input fields.
If it succeeds, display a success message to the user and clear the input fields.

All success, error, or informational messages should be displayed in the form of toasts in 
the top right corner.

For now, this is all the required functionality of the application. Ensure that it properly
writes information to the datatables, this is the most critical part. Later, it will be 
accessing those data tables to extract information.