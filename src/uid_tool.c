#include <sys/syscall.h>
#include <stdint.h>
#include <sys/ioctl.h>
#include <ctype.h>

// zig cc -target aarch64-linux -Oz -s -Wl,--gc-sections,--strip-all,-z,norelro -fno-unwind-tables -Wl,--entry=__start uid_tool.c -o uid_tool 

// syscall de-wrappers
#if defined(__aarch64__)
__attribute__((noinline))
static long __syscall(long n, long a, long b, long c, long d, long e, long f)
{
	register long 
		x8 asm("x8") = n,
		x0 asm("x0") = a,
		x1 asm("x1") = b,
		x2 asm("x2") = c,
		x3 asm("x3") = d,
		x4 asm("x4") = e,
		x5 asm("x5") = f;

	asm volatile("svc #0"
		:"=r"(x0)
		:"r"(x8), "r"(x0), "r"(x1), "r"(x2), "r"(x3), "r"(x4), "r"(x5)
		:"memory");

	return x0;
}

#elif defined(__arm__)
__attribute__((noinline))
static long __syscall(long n, long a, long b, long c, long d, long e, long f) {
	register long
		r7 asm("r7") = n,
		r0 asm("r0") = a,
		r1 asm("r1") = b,
		r2 asm("r2") = c,
		r3 asm("r3") = d,
		r4 asm("r4") = e,
		r5 asm("r5") = f;

	asm volatile("svc #0"
		: "=r"(r0)
		: "r"(r7), "r"(r0), "r"(r1), "r"(r2), "r"(r3), "r"(r4), "r"(r5)
		: "memory");

	return r0;
}

#elif defined(__x86_64__)
__attribute__((noinline))
static long __syscall(long n, long a, long b, long c, long d, long e, long f) {
	long ret;
	asm volatile(
		"mov %5, %%r10\n"
		"mov %6, %%r8\n"
		"mov %7, %%r9\n"
		"syscall"
		: "=a"(ret)
		: "a"(n), "D"(a), "S"(b), "d"(c), "r"(d), "r"(e), "r"(f)
		: "rcx", "r11", 
		"memory");

	return ret;
}
#endif

// https://gcc.gnu.org/onlinedocs/gcc/Library-Builtins.html
// https://clang.llvm.org/docs/LanguageExtensions.html#builtin-functions
#define strlen __builtin_strlen
#define memcmp __builtin_memcmp

// get uid from kernelsu
struct ksu_get_manager_uid_cmd {
	uint32_t uid;
};
#define KSU_IOCTL_GET_MANAGER_UID _IOC(_IOC_READ, 'K', 10, 0)
#define KSU_INSTALL_MAGIC1 0xDEADBEEF
#define KSU_INSTALL_MAGIC2 0xCAFEBABE

#define NONE 0

__attribute__((always_inline))
static int dumb_str_to_appuid(const char *str)
{
	int uid = 0;
	int i = 4;
	int m = 1;

	do {
		// llvm actually has an optimized isdigit
		// just not prefixed with __builtin
		// code generated is the same size, so better use it
		if (!isdigit(str[i]))
			return 0;

		uid = uid + ( *(str + i) - 48 ) * m;
		m = m * 10;
		i--;
	} while (!(i < 0));

	if (!(uid > 10000 && uid < 20000))
		return 0;

	return uid;
}

__attribute__((always_inline))
static int fail(void)
{
	const char *error = "fail\n";
	__syscall(SYS_write, 2, (long)error, strlen(error), NONE, NONE, NONE);
	return 1;
}

// https://github.com/backslashxx/various_stuff/blob/master/ksu_prctl_test/ksu_prctl_02_only.c
__attribute__((always_inline))
static int dumb_print_appuid(int uid)
{
	char digits[6];

	int i = 4;
	do {
		digits[i] = 48 + (uid % 10);
		uid = uid / 10;
		i--;			
	} while (!(i < 0));

	digits[5] = '\n';

	__syscall(SYS_write, 1, (long)digits, 6, NONE, NONE, NONE);
	return 0;
}

__attribute__((always_inline))
static int show_usage(void)
{
	const char *usage = "Usage:\n./uidtool --setuid <uid>\n./uidtool --getuid\n";
	__syscall(SYS_write, 2, (long)usage, strlen(usage), NONE, NONE, NONE);
	return 1;
}

__attribute__((always_inline))
static int c_main(int argc, char **argv, char **envp)
{
	const char *ok = "ok\n";

	if (!argv[1])
		goto show_usage;

	if (!memcmp(argv[1], "--setuid", strlen("--setuid") + 1) && 
		!!argv[2] && !!argv[2][4] && !argv[2][5] && !argv[3]) {
		int magic1 = 0xDEADBEEF;
		int magic2 = 10006;
		uintptr_t arg = 0;
		
		unsigned int cmd = dumb_str_to_appuid(argv[2]);
		if (!cmd)
			goto fail;
		
		__syscall(SYS_reboot, magic1, magic2, cmd, (long)&arg, NONE, NONE);

		if (arg && *(uintptr_t *)arg == arg ) {
			__syscall(SYS_write, 2, (long)ok, strlen(ok), NONE, NONE, NONE);
			return 0;
		}
		
		goto fail;
	}

	if (!memcmp(argv[1], "--getuid", strlen("--getuid") + 1) && !argv[2]) {
		unsigned int fd = 0;
		
		// we dont care about closing the fd, it gets released on exit automatically
		__syscall(SYS_reboot, KSU_INSTALL_MAGIC1, KSU_INSTALL_MAGIC2, 0, (long)&fd, NONE, NONE);
		if (!fd)
			goto fail;

		struct ksu_get_manager_uid_cmd cmd;
		int ret = __syscall(SYS_ioctl, fd, KSU_IOCTL_GET_MANAGER_UID, (long)&cmd, NONE, NONE, NONE);
		if (ret)
			goto fail;

		if (!(cmd.uid > 10000 && cmd.uid < 20000))
			goto fail;

		return dumb_print_appuid(cmd.uid);
	}

show_usage:
	return show_usage();

fail:
	return fail();
}

void prep_main(long *sp)
{
	long argc = *sp;
	char **argv = (char **)(sp + 1);
	char **envp = (char **)(sp + 2);

	long exit_code = c_main(argc, argv, envp);
	__syscall(SYS_exit, exit_code, NONE, NONE, NONE, NONE, NONE);
}


// arch specific small entry points
#if defined(__aarch64__)
__attribute__((naked))
void __start(void) {
	asm volatile(
		"mov x0, sp\n"
		"b prep_main\n"
	);
}

#elif defined(__arm__)
__attribute__((naked))
void __start(void) {
	asm volatile(
		"mov r0, sp\n"
		"b prep_main\n"
    );
}

#elif defined(__x86_64__)
__attribute__((naked, section(".text.start"))) 
void __start(void) {
	asm volatile(
		"mov %rsp, %rdi\n"
		"jmp prep_main\n"
	);
}
#endif
