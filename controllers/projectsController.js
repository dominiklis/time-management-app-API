const { projectsServices } = require("../services");

const getProjects = async (req, res, next) => {
  try {
    const result = await projectsServices.get(req.user);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getProjectById = async (req, res, next) => {
  const { projectId } = req.params;

  try {
    const result = await projectsServices.getById(req.user, projectId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const createProject = async (req, res, next) => {
  const { projectName, projectDescription } = req.body;

  try {
    const result = await projectsServices.create(
      req.user,
      projectName,
      projectDescription
    );
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const editProject = async (req, res, next) => {
  const { projectName, projectDescription } = req.body;
  const { projectId } = req.params;

  try {
    const result = await projectsServices.edit(
      req.user,
      projectId,
      projectName,
      projectDescription
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const deleteProject = async (req, res, next) => {
  const { projectId } = req.params;

  try {
    const result = await projectsServices.remove(req.user, projectId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProjects,
  getProjectById,
  createProject,
  editProject,
  deleteProject,
};
