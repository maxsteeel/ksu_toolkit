#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/syscall.h>
#include <unistd.h>
#include <stdint.h>

int main(int argc, char *argv[]) {
	if (argc != 2) {
		printf("Usage: %s <uid>\n", argv[0]);
		return 1;
	}

	int magic1 = 0xDEADBEEF;
	int magic2 = 10006;
	unsigned int cmd = strtoul(argv[1], NULL, 0);
	const char *arg = "dummy_value";

	printf("SYS_reboot(%d, %d, %u, %p)\n", magic1, magic2, cmd, (void *)&arg);
	syscall(SYS_reboot, magic1, magic2, cmd, (void *)&arg);

	// if our arg contains our pointer then its good
	printf("reply: 0x%lx verdict: %s\n", *(uintptr_t *)arg, *(uintptr_t *)arg == (uintptr_t)arg ? "ok" : "fail" );
	
	return 0;

}
