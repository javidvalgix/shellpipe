export default interface IWorkspace {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  color?: string; // Optional color label for the workspace
  icon?: string;  // Optional icon for the workspace
}
