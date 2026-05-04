module.exports = {
	apps: [
		{
			name: "mtx-webapp",
			script: "npm",
			args: "start",
			interpreter: "none",
			env: {
				NODE_ENV: "production",
				PORT: 4000,
			},
		},
	],
};
