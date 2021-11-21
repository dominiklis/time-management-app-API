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
  const { id } = req.params;

  try {
    const result = await projectsServices.getById(req.user, id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const createProject = async (req, res, next) => {
  const { name, description } = req.body;

  try {
    const result = await projectsServices.create(req.user, name, description);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const editProject = async (req, res, next) => {
  const { name, description } = req.body;
  const { id } = req.params;

  try {
    const result = await projectsServices.edit(req.user, id, name, description);
    res.status(204).json(result);
  } catch (error) {
    next(error);
  }
};

const deleteProject = async (req, res, next) => {
  const { id } = req.params;

  try {
    const result = await projectsServices.remove(req.user, id);
    res.status(204).json(result);
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
