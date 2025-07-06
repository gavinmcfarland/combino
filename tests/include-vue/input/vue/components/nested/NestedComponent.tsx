import { defineComponent } from 'vue';

export default defineComponent({
	name: 'NestedComponent',
	template: `
		<div>
			<h2>Nested Component</h2>
			<p>This is a nested component from the included template.</p>
		</div>
	`,
});
