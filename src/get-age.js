export default birthDate => Math.trunc((new Date() - new Date(birthDate)) / (1000 * 60 * 60 * 24 * 365.245))
