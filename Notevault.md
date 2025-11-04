### 🏛️ App Overview: "Note Vault"

This is a design mockup for a standalone desktop application named **"Note Vault"**. Its primary purpose is to serve as a database and management system for technical notes, specifically for manufacturing, engineering, or quality assurance (QA) processes.

The application features a three-column layout, enabling users to simultaneously browse notes, view a selected note's details, and edit or create a new note.

---

### Layout and Component Breakdown

The UI is divided into three distinct vertical panels:

#### 1. Left Panel: Note Navigation / Index

* **Function:** This panel acts as the main navigation and index for the entire database of notes.
* **UI Components:**
    * It displays a **scrollable list of thumbnails**.
    * Each thumbnail is a small preview of a saved note or page (containing both text and images).
    * Up and down arrow buttons at the top and bottom allow the user to scroll through the list of saved notes.
* **Interaction:** A user would click on one of these thumbnails to load the full, detailed note into the Center Panel for viewing.

#### 2. Center Panel: Detailed Note Viewer

* **Function:** This is the primary content display area. It shows the full details of the note selected from the Left Panel.
* **UI Components:**
    * **Button:** An "Expand Note" button at the top, suggesting the user can enter a full-screen or focused view mode.
    * **Note Title/ID:** A prominent title, "KNX0400", which likely serves as a unique Part ID or Note ID from the database.
    * **Note Body:** A large, scrollable text area. The content is a detailed technical procedure.
        * **Content Example:** The text includes specific instructions like "100% visual look for cable flexibility," "AQL" (Acceptable Quality Limit), and a multi-step process ("Then, Keyence 7020, then M14 threads...").
        * It references specific programs and parts, such as "IP columns D, E, F: Keyence 7020 program 'KNX0400 High Precision Cable Side'". This indicates a system for organizing complex, multi-part instructions.
    * **Embedded Media:** Two images are displayed side-by-side at the bottom of the note, showing close-ups of a mechanical part in what appears to be a measurement jig or fixture.
    * **Image Caption:** A caption below the images reads, "▲Use aluminum block for all Keyence measurements."
    * **Pagination:** "Page 1" is shown at the bottom.

#### 3. Right Panel: Note Editor / Creator

* **Function:** This panel is the interface for creating new notes or editing existing ones to be saved in the database.
* **UI Components:**
    * **Button:** An "Add New Note" button at the top to initiate a new, blank note entry.
    * **Input Fields:**
        * **"PART ID":** A single-line text field for the note's primary identifier.
        * **"INSPECTION NOTES":** A large, multi-line text area for inputting the main body of the note. It shows placeholder text ("Note #1: This is the details...").
    * **Image Uploader:**
        * Two distinct "Add Image" buttons.
        * Below each button is a placeholder box (likely to show the image preview once uploaded).
        * An "Image caption (optional)" text field is associated with each image.
    * **Pagination:** "Page 1" is shown at the bottom, implying notes can have multiple pages.