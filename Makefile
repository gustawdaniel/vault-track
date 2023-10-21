clean:
	find . -type d \( -name 'dist' -o -name 'node_modules' -o -name '.output' -o -name '.nuxt' \) -prune -exec rm -rf '{}' \;
